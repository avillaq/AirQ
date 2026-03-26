from app.api import bp
from datetime import datetime
from flask import jsonify, request
from dotenv import load_dotenv
import requests
from app.extensions import db
from app.email_service import email_service
from .models import Subscriptions
import pandas as pd
from pathlib import Path
import os
load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV_PATH = os.path.join(BASE_DIR, "..", "client", "public", "worldcities.csv")
CSV_PATH = os.path.abspath(CSV_PATH)

def setup_earthdata_netrc():
    user = os.getenv("EARTHDATA_USER")
    password = os.getenv("EARTHDATA_PASS")

    if not user or not password:
        print("No se encontraron credenciales EarthData en variables de entorno.")
        return

    netrc_path = Path.home() / ".netrc"
    content = f"""machine urs.earthdata.nasa.gov
    login {user}
    password {password}
    """

    # Crea el archivo con permisos seguros
    netrc_path.write_text(content)
    os.chmod(netrc_path, 0o600)
    print(f"Archivo .netrc creado en {netrc_path}")

# Llamar al inicio de la app
setup_earthdata_netrc()

# Cargar CSV de ciudades
try:
    cities = pd.read_csv(CSV_PATH)
    print(f"CSV cargado correctamente: {len(cities)} ciudades desde {CSV_PATH}")
except FileNotFoundError:
    print(f"ERROR: No se encontró el archivo CSV en: {CSV_PATH}")
    cities = pd.DataFrame(columns=['city', 'country', 'lat', 'lng'])

EARTHDATA_USER = os.getenv("EARTHDATA_USER")
EARTHDATA_PASS = os.getenv("EARTHDATA_PASS")

print(EARTHDATA_PASS)
print(EARTHDATA_USER)


# Datos actuales de calidad de aire y clima
CURRENT_AIR_QUALITY_API = "https://air-quality-api.open-meteo.com/v1/air-quality"
CURRENT_WEATHER_API = "https://api.open-meteo.com/v1/forecast"

# Datos de pronostico de calidad de aire y clima
CALIDAD_AIRE_PREDICCION_API = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-16.409&longitude=-71.5375&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&timezone=auto&forecast_days=5"

CLIMA_PREDICCION_API = "https://api.open-meteo.com/v1/forecast?latitude=-16.409&longitude=-71.5375&hourly=temperature_2m,relative_humidity_2m,windspeed_10m&timezone=auto&forecast_days=5"


@bp.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "API funcionando correctamente",
        "timestamp": datetime.now().isoformat(),
    }), 200

@bp.route("/air/latest", methods=["GET"])
def air_latest():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    response = requests.get(
        CURRENT_AIR_QUALITY_API,
        params={
            "latitude": lat,
            "longitude": lng,
            "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
            "timezone": "auto"
        }
    )
    air_quality_data = response.json()

    return jsonify({
        "status": "ok",
        "location": {
            "lat": air_quality_data["latitude"],
            "lng": air_quality_data["longitude"]
        },
        "values": {
            "pm10": air_quality_data["current"]["pm10"],
            "pm2_5": air_quality_data["current"]["pm2_5"],
            "co": air_quality_data["current"]["carbon_monoxide"],
            "no2": air_quality_data["current"]["nitrogen_dioxide"],
            "o3": air_quality_data["current"]["ozone"],
            "us_aqi": air_quality_data["current"]["us_aqi"],
            "timestamp": air_quality_data["current"]["time"],
        }
    })

@bp.route("/weather/latest", methods=["GET"])
def weather_latest():
    lat = request.args.get("lat", default=-16.409, type=float)
    lng = request.args.get("lng", default=-71.5375, type=float)
    response = requests.get(
        CURRENT_WEATHER_API,
        params={
            "latitude": lat,
            "longitude": lng,
            "current": "temperature_2m,relative_humidity_2m,windspeed_10m",
            "timezone": "auto"
        }
    )
    weather_data = response.json()

    return jsonify({
        "status": "ok",
        "location": {
            "lat": weather_data["latitude"],
            "lng": weather_data["longitude"]
        },
        "values": {
            "temperature": weather_data["current"]["temperature_2m"],
            "humidity": weather_data["current"]["relative_humidity_2m"],
            "windspeed": weather_data["current"]["windspeed_10m"],
            "timestamp": weather_data["current"]["time"],
        }
    })

@bp.route('/alerts/subscribe', methods=['POST'])
def create_subscription():
    data = request.get_json()
    threshold = Subscriptions.calculate_threshold(int(data['age']))
    
    subscription = Subscriptions(
        fullname=f"{data['firstName']} {data['lastName']}",
        age=int(data['age']),
        email=data['email'],
        latitude=float(data['location'].split(',')[0]),
        longitude=float(data['location'].split(',')[1]),
        threshold=threshold
    )
    
    db.session.add(subscription)
    db.session.commit()
    
    return jsonify({
        'status': 'ok',
        'message': 'Subscription created successfully',
        'threshold': threshold,
        'sensitivity_group': subscription.sensitivity_group
    }), 201

@bp.route('/alerts/check', methods=['GET'])
def check_alerts():
    try:
        subscriptions = Subscriptions.query.all()
        
        if not subscriptions:
            return jsonify({
                'success': "ok",
                'message': 'No subscriptions found.',
                'stats': {
                    'total_subscriptions': 0,
                    'unique_locations': 0,
                    'api_calls': 0,
                    'messages_sent': 0
                }
            }), 200
        
        location_groups = {}
        for sub in subscriptions:
            location_key = (round(sub.latitude, 2), round(sub.longitude, 2))
            
            if location_key not in location_groups:
                location_groups[location_key] = []
            location_groups[location_key].append(sub)
        
        aqi_cache = {}
        api_calls = 0
        
        for (lat, lon), subs in location_groups.items():
            try:
                response = requests.get(
                    CURRENT_AIR_QUALITY_API,
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "current": "us_aqi",
                        "timezone": "auto"
                    },
                    timeout=30
                )
                response.raise_for_status()
                
                air_quality_data = response.json()
                aqi = air_quality_data.get("current", {}).get("us_aqi")
                
                if aqi is not None:
                    aqi_cache[(lat, lon)] = int(aqi)
                    api_calls += 1
                else:
                    aqi_cache[(lat, lon)] = None
                    
            except requests.exceptions.RequestException as e:
                aqi_cache[(lat, lon)] = None
                continue
        
        messages_sent = 0
        for (lat, lon), subs in location_groups.items():
            aqi = aqi_cache.get((lat, lon))
            
            if aqi is None:
                continue
            
            for sub in subs:
                if aqi > sub.threshold:
                    try:
                        email_service.send_aqi_alert(
                            recipient=sub.email,
                            first_name=sub.fullname.split(' ')[0],
                            last_name=sub.fullname.split(' ')[-1],
                            aqi=aqi,
                            location=f"[{sub.latitude}, {sub.longitude}]"
                        )
                        messages_sent += 1
                    except Exception as e:
                        print(f"[ERROR] Failed to send email to {sub.email}: {str(e)}")
                        continue
        
        return jsonify({
            'success': "ok",
            'message': f'Checked alerts. {messages_sent} notifications sent.',
            'stats': {
                'total_subscriptions': len(subscriptions),
                'unique_locations': len(location_groups),
                'api_calls': api_calls,
                'messages_sent': messages_sent,
                'efficiency': f"{((len(subscriptions) - api_calls) / len(subscriptions) * 100):.1f}% reduction" if len(subscriptions) > 0 else "N/A"
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': "error",
            'message': f'Error checking alerts: {str(e)}'
        }), 500
    
@bp.route("/cities/search", methods=["GET"])
def search_cities():
    """
    Buscar ciudades por nombre.
    
    Query params:
        - q (str): Término de búsqueda
        - limit (int, opcional): Límite de resultados, default=10
    """
    try:
        if cities.empty:
            return jsonify({
                "status": "error",
                "message": "Cities database not available"
            }), 503
        
        query = request.args.get("q", type=str)
        limit = request.args.get("limit", default=10, type=int)
        
        if not query or len(query) < 2:
            return jsonify({
                "status": "error",
                "message": "Query must be at least 2 characters"
            }), 400
        
        # Buscar en el CSV
        filtered = cities[
            cities['city'].str.contains(query, case=False, na=False) |
            cities['country'].str.contains(query, case=False, na=False)
        ].head(limit)
        
        results = filtered[['city', 'country', 'lat', 'lng']].to_dict('records')
        
        return jsonify({
            "status": "ok",
            "count": len(results),
            "cities": results
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': "error",
            'message': f'Error checking alerts: {str(e)}'
        }), 500

# === FUNCIÓN PARA OBTENER DATOS MERRA2 ===
def get_merra2_data(lat, lon, date_str, hour=0):
    """
    Consulta datos de MERRA2 (temperatura, humedad, viento) para una lat/lon y fecha.
    """
    if not EARTHDATA_USER or not EARTHDATA_PASS:
        print("Error: Credenciales EarthData no configuradas")
        return None
    
    base_url = "https://goldsmr4.gesdisc.eosdis.nasa.gov/opendap/hyrax/MERRA2/M2T1NXSLV.5.12.4/"
    
    # convertir fecha
    date = datetime.strptime(date_str, "%Y-%m-%d")
    yyyy, mm, dd = date.strftime("%Y"), date.strftime("%m"), date.strftime("%d")

    # archivo diario
    filename = f"MERRA2_400.tavg1_2d_slv_Nx.{yyyy}{mm}{dd}.nc4.ascii"

    lat_idx = int(round(lat + 90) / 0.5)
    lon_idx = int(round(lon + 180) / 0.625)
    
    # Asegurar que estén en el rango válido
    lat_idx = max(0, min(360, lat_idx))
    lon_idx = max(0, min(575, lon_idx))
    hour = max(0, min(23, hour))
    print(f"Coordenadas: lat={lat}, lon={lon}")
    print(f"Índices de grilla calculados: lat_idx={lat_idx}, lon_idx={lon_idx}, hour={hour}")
    print(f"Fecha: {yyyy}-{mm}-{dd}")
    # construir la URL (hora = índice 0-23)
    variables = ["T2M", "QV2M", "U2M", "V2M"]

    query = ",".join([f"{v}%5B{hour}%5D%5B{lat_idx}%5D%5B{lon_idx}%5D" for v in variables])
    
    url = f"{base_url}{yyyy}/{mm}/{filename}?{query}"
    print(f"URL construida: {url}")

    # sesión con autenticación EarthData
    session = requests.Session()
    session.auth = (EARTHDATA_USER, EARTHDATA_PASS)
    
    try:
        print(f" Consultando MERRA2...")
        response = session.get(url, timeout=30)

        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error {response.status_code}: {response.text[:200]}")
            return None
        
        # Parsear respuesta ASCII de OPeNDAP
        raw_data = response.text
        print(f" Datos recibidos (primeros 500 chars):\n{raw_data[:500]}")
        
        # Extraer valores (formato ASCII de OPeNDAP)
        lines = raw_data.strip().split('\n')
        data_dict = {}
        
        for line in lines:
            # El formato ASCII de OPeNDAP es complejo, necesitamos parsear mejor
            if 'T2M' in line or 'QV2M' in line or 'U2M' in line or 'V2M' in line:
                print(f"Línea encontrada: {line[:200]}")
                
                # Intentar extraer el valor numérico
                try:
                    # El formato típico es: "Variable[indices], value"
                    if ',' in line:
                        parts = line.split(',')
                        value_str = parts[-1].strip().rstrip(';')
                        value = float(value_str)
                        
                        # Determinar variable
                        if 'T2M' in line:
                            data_dict['T2M'] = value
                        elif 'QV2M' in line:
                            data_dict['QV2M'] = value
                        elif 'U2M' in line:
                            data_dict['U2M'] = value
                        elif 'V2M' in line:
                            data_dict['V2M'] = value
                except ValueError as e:
                    print(f"No se pudo parsear valor: {e}")
                    continue
        
        print(f"Datos extraídos: {data_dict}")
        
        if not data_dict:
            print(" No se pudieron extraer datos del response")
            return None
        
        return data_dict
        
    except requests.exceptions.Timeout:
        print(f" Timeout después de 60 segundos")
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"Error de conexión con MERRA2: {str(e)}")
        return None
    except Exception as e:
        print(f"Error al procesar datos MERRA2: {str(e)}")
        return None

# === ENDPOINT PARA DATOS HISTÓRICOS MERRA2 ===
@bp.route("/historical/merra2", methods=["GET"])
def get_historical_merra2():
    """
    Endpoint para obtener datos históricos de MERRA2.
    
    Query params:
        - lat (float): Latitud
        - lng (float): Longitud
        - date (str): Fecha en formato YYYY-MM-DD
        - hour (int, opcional): Hora del día (0-23), default=12
    
    Returns:
        JSON con datos climáticos históricos
    """
    try:
        # Obtener parámetros
        lat = request.args.get("lat", type=float)
        lng = request.args.get("lng", type=float)
        date_str = request.args.get("date", type=str)
        hour = request.args.get("hour", default=12, type=int)
        
        # Validar parámetros
        if not lat or not lng:
            return jsonify({
                "status": "error",
                "message": "Latitude and longitude are required"
            }), 400
        
        if not date_str:
            return jsonify({
                "status": "error",
                "message": "Date is required (format: YYYY-MM-DD)"
            }), 400
        
        if hour < 0 or hour > 23:
            return jsonify({
                "status": "error",
                "message": "Hour must be between 0 and 23"
            }), 400
        
        # Validar formato de fecha
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({
                "status": "error",
                "message": "Invalid date format. Use YYYY-MM-DD"
            }), 400
        
        # Consultar datos MERRA2
        merra_data = get_merra2_data(lat, lng, date_str, hour)
        
        if merra_data is None:
            return jsonify({
                "status": "error",
                "message": "Failed to retrieve MERRA2 data. Check if the date is valid (1980-present)."
            }), 500
        
        # Formatear respuesta
        return jsonify({
            "status": "ok",
            "location": {
                "lat": lat,
                "lng": lng
            },
            "datetime": {
                "date": date_str,
                "hour": hour
            },
            "values": {
                "temperature_2m": merra_data.get("T2M"),  # Temperatura a 2m (K)
                "humidity_2m": merra_data.get("QV2M"),    # Humedad específica (kg/kg)
                "wind_u_10m": merra_data.get("U2M"),      # Componente U del viento (m/s)
                "wind_v_10m": merra_data.get("V2M"),      # Componente V del viento (m/s)
            },
            "units": {
                "temperature_2m": "Kelvin",
                "humidity_2m": "kg/kg",
                "wind_u_10m": "m/s",
                "wind_v_10m": "m/s"
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500

@bp.route("/air/points", methods=["GET"])
def get_air_points():
    
    # Puntos fijos con ubicaciones reales y AQI variado
    geojson = {
        "type": "FeatureCollection",
        "features": [
            # Asia - Muy contaminadas (rojos/morados)
            {
                "type": "Feature",
                "properties": {"id": "delhi", "name": "New Delhi, India", "aqi": 185, "pm25": 120},
                "geometry": {"type": "Point", "coordinates": [77.2245, 28.6358]}
            },
            {
                "type": "Feature", 
                "properties": {"id": "beijing", "name": "Beijing, China", "aqi": 165, "pm25": 95},
                "geometry": {"type": "Point", "coordinates": [116.4074, 39.9042]}
            },
            {
                "type": "Feature",
                "properties": {"id": "dhaka", "name": "Dhaka, Bangladesh", "aqi": 195, "pm25": 135},
                "geometry": {"type": "Point", "coordinates": [90.4125, 23.8103]}
            },
            {
                "type": "Feature",
                "properties": {"id": "mumbai", "name": "Mumbai, India", "aqi": 155, "pm25": 88},
                "geometry": {"type": "Point", "coordinates": [72.8777, 19.0760]}
            },
            
            # América - Moderadas (amarillos/naranjas)
            {
                "type": "Feature",
                "properties": {"id": "losangeles", "name": "Los Angeles, USA", "aqi": 85, "pm25": 35},
                "geometry": {"type": "Point", "coordinates": [-118.2437, 34.0522]}
            },
            {
                "type": "Feature",
                "properties": {"id": "mexicocity", "name": "Mexico City, Mexico", "aqi": 115, "pm25": 58},
                "geometry": {"type": "Point", "coordinates": [-99.1332, 19.4326]}
            },
            {
                "type": "Feature",
                "properties": {"id": "lima", "name": "Lima, Peru", "aqi": 125, "pm25": 65},
                "geometry": {"type": "Point", "coordinates": [-77.0428, -12.0464]}
            },
            {
                "type": "Feature",
                "properties": {"id": "santiago", "name": "Santiago, Chile", "aqi": 105, "pm25": 52},
                "geometry": {"type": "Point", "coordinates": [-70.6693, -33.4489]}
            },
            {
                "type": "Feature",
                "properties": {"id": "bogota", "name": "Bogotá, Colombia", "aqi": 98, "pm25": 45},
                "geometry": {"type": "Point", "coordinates": [-74.0721, 4.7110]}
            },
            {
                "type": "Feature",
                "properties": {"id": "saopaulo", "name": "São Paulo, Brazil", "aqi": 95, "pm25": 42},
                "geometry": {"type": "Point", "coordinates": [-46.6333, -23.5505]}
            },
            
            # Europa - Limpias (verdes)
            {
                "type": "Feature",
                "properties": {"id": "london", "name": "London, UK", "aqi": 45, "pm25": 15},
                "geometry": {"type": "Point", "coordinates": [-0.1278, 51.5074]}
            },
            {
                "type": "Feature",
                "properties": {"id": "paris", "name": "Paris, France", "aqi": 55, "pm25": 18},
                "geometry": {"type": "Point", "coordinates": [2.3522, 48.8566]}
            },
            {
                "type": "Feature",
                "properties": {"id": "berlin", "name": "Berlin, Germany", "aqi": 42, "pm25": 14},
                "geometry": {"type": "Point", "coordinates": [13.4050, 52.5200]}
            },
            
            # Otras regiones
            {
                "type": "Feature",
                "properties": {"id": "tokyo", "name": "Tokyo, Japan", "aqi": 65, "pm25": 22},
                "geometry": {"type": "Point", "coordinates": [139.6917, 35.6895]}
            },
            {
                "type": "Feature",
                "properties": {"id": "sydney", "name": "Sydney, Australia", "aqi": 35, "pm25": 12},
                "geometry": {"type": "Point", "coordinates": [151.2093, -33.8688]}
            },
            {
                "type": "Feature",
                "properties": {"id": "reykjavik", "name": "Reykjavik, Iceland", "aqi": 25, "pm25": 8},
                "geometry": {"type": "Point", "coordinates": [-21.9426, 64.1466]}
            },
            {
                "type": "Feature",
                "properties": {"id": "dubai", "name": "Dubai, UAE", "aqi": 88, "pm25": 38},
                "geometry": {"type": "Point", "coordinates": [55.2708, 25.2048]}
            },
            {
                "type": "Feature",
                "properties": {"id": "cairo", "name": "Cairo, Egypt", "aqi": 135, "pm25": 72},
                "geometry": {"type": "Point", "coordinates": [31.2357, 30.0444]}
            }
        ]
    }
    
    print(f"Devolviendo {len(geojson['features'])} puntos fijos")
    return jsonify(geojson), 200
