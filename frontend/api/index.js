import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/*export async function getAirQualityPoints() {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const res = await fetch(`${base}/air/points`);
  if (!res.ok) throw new Error('Error obteniendo puntos de aire');
  return res.json();
}*/

export async function getAirQualityData(location) {
  const { lat, lng } = location;
  const { data } = await api.get("/air/latest", {
    params: { lat, lng }
  });
  return data;
}

export async function getWeatherData(location) {
  const { lat, lng } = location;
  const { data } = await api.get("/weather/latest", {
    params: { lat, lng }
  });
  return data;
}

export async function subscribeToAlerts(dataToSend) {
  const { data } = await api.post("/alerts/subscribe", dataToSend);
  return data;
}

export async function getHistoricalMerra2Data({ lat, lng, date, hour = 12 }) {
  const { data } = await api.get("/historical/merra2", {
    params: { 
      lat, 
      lng, 
      date,  
      hour   
    }
  });
  return data;
}

// Función para buscar ciudades
export async function searchCities(query, limit = 10) {
  const { data } = await api.get("/cities/search", {
    params: { q: query, limit }
  });
  return data;
}

function buildMockGeoJSON(count = 6) {
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: count }).map((_, i) => ({
      type: 'Feature',
      properties: {
        id: `mock-${i + 1}`,
        name: `Punto ${i + 1}`,
        aqi: Math.floor(Math.random() * 250) + 20
      },
      geometry: {
        type: 'Point',
        coordinates: [
          -74.08 + (Math.random() * 20 - 10),
          4.6 + (Math.random() * 20 - 10)
        ]
      }
    }))
  };
}

export async function getAirQualityPoints() {
  try {
    const { data } = await api.get('/air/points', { timeout: 10000 });
    return data;
  } catch (error) {
    console.error('Error fetching air quality points:', error);
    throw error; 
  }
}
export default api;