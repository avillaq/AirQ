from datetime import datetime
import logging
import os

import requests
from flask import jsonify, request

from app.api import bp
from .schemas import HistoricalMerra2QuerySchema, ValidationError

logger = logging.getLogger(__name__)

EARTHDATA_USER = os.getenv("EARTHDATA_USER")
EARTHDATA_PASS = os.getenv("EARTHDATA_PASS")
REQUEST_TIMEOUT_SECONDS = 30


def _validation_error_response(err):
    return jsonify({
        "status": "error",
        "message": err.message,
        "details": err.details,
    }), 400


@bp.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "nasa-history-api",
        "message": "Historical NASA service is running",
        "timestamp": datetime.now().isoformat(),
    }), 200


# === FUNCIÓN PARA OBTENER DATOS MERRA2 ===
def get_merra2_data(lat, lon, date_str, hour=0):
    if not EARTHDATA_USER or not EARTHDATA_PASS:
        logger.warning("EarthData credentials are not configured")
        return None

    base_url = "https://goldsmr4.gesdisc.eosdis.nasa.gov/opendap/hyrax/MERRA2/M2T1NXSLV.5.12.4/"

    date = datetime.strptime(date_str, "%Y-%m-%d")
    yyyy, mm, dd = date.strftime("%Y"), date.strftime("%m"), date.strftime("%d")
    filename = f"MERRA2_400.tavg1_2d_slv_Nx.{yyyy}{mm}{dd}.nc4.ascii"

    lat_idx = int(round(lat + 90) / 0.5)
    lon_idx = int(round(lon + 180) / 0.625)

    lat_idx = max(0, min(360, lat_idx))
    lon_idx = max(0, min(575, lon_idx))
    hour = max(0, min(23, hour))

    variables = ["T2M", "QV2M", "U2M", "V2M"]
    query = ",".join([f"{v}%5B{hour}%5D%5B{lat_idx}%5D%5B{lon_idx}%5D" for v in variables])

    url = f"{base_url}{yyyy}/{mm}/{filename}?{query}"

    session = requests.Session()
    session.auth = (EARTHDATA_USER, EARTHDATA_PASS)

    try:
        response = session.get(url, timeout=REQUEST_TIMEOUT_SECONDS)

        if response.status_code != 200:
            logger.warning("MERRA2 returned status %s", response.status_code)
            return None

        raw_data = response.text
        lines = raw_data.strip().split("\n")
        data_dict = {}

        for line in lines:
            if "T2M" in line or "QV2M" in line or "U2M" in line or "V2M" in line:
                try:
                    if "," in line:
                        parts = line.split(",")
                        value_str = parts[-1].strip().rstrip(";")
                        value = float(value_str)

                        if "T2M" in line:
                            data_dict["T2M"] = value
                        elif "QV2M" in line:
                            data_dict["QV2M"] = value
                        elif "U2M" in line:
                            data_dict["U2M"] = value
                        elif "V2M" in line:
                            data_dict["V2M"] = value
                except ValueError as e:
                    logger.debug("Could not parse MERRA2 line value: %s", str(e))
                    continue

        if not data_dict:
            logger.warning("No MERRA2 values could be parsed for request")
            return None

        return data_dict

    except requests.exceptions.Timeout:
        logger.warning("MERRA2 request timed out")
        return None
    except requests.exceptions.RequestException as e:
        logger.warning("MERRA2 connection error: %s", str(e))
        return None
    except Exception as e:
        logger.exception("Unexpected MERRA2 processing error: %s", str(e))
        return None


@bp.route("/historical/merra2", methods=["GET"])
def get_historical_merra2():
    try:
        validated = HistoricalMerra2QuerySchema.validate(request.args)
        lat = validated["lat"]
        lng = validated["lng"]
        date_str = validated["date"]
        hour = validated["hour"]

        merra_data = get_merra2_data(lat, lng, date_str, hour)

        if merra_data is None:
            return jsonify({
                "status": "error",
                "message": "Failed to retrieve MERRA2 data. Check if the date is valid (1980-present)."
            }), 500

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
                "temperature_2m": merra_data.get("T2M"),
                "humidity_2m": merra_data.get("QV2M"),
                "wind_u_10m": merra_data.get("U2M"),
                "wind_v_10m": merra_data.get("V2M"),
            },
            "units": {
                "temperature_2m": "Kelvin",
                "humidity_2m": "kg/kg",
                "wind_u_10m": "m/s",
                "wind_v_10m": "m/s"
            }
        }), 200

    except ValidationError as err:
        return _validation_error_response(err)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500
