import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 400;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeApiError(error) {
  const statusCode = error?.response?.status;
  const serverMessage = error?.response?.data?.message;
  const networkMessage = error?.message;

  if (serverMessage) {
    return {
      message: serverMessage,
      statusCode,
      isNetworkError: false,
    };
  }

  if (!statusCode) {
    return {
      message: 'Network error: unable to reach API service',
      statusCode: null,
      isNetworkError: true,
    };
  }

  return {
    message: networkMessage || 'Unexpected API error',
    statusCode,
    isNetworkError: false,
  };
}

async function requestWithRetry(requestFn, options = {}) {
  const attempts = options.attempts ?? DEFAULT_RETRY_ATTEMPTS;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  let lastError;

  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const normalized = normalizeApiError(error);
      const canRetry = attempt < attempts && (normalized.isNetworkError || (normalized.statusCode >= 500 && normalized.statusCode < 600));
      if (!canRetry) {
        throw normalized;
      }
      await sleep(initialDelayMs * Math.pow(2, attempt));
    }
  }

  throw normalizeApiError(lastError);
}

function hasAllKeys(target, keys) {
  return keys.every((key) => target[key] !== null && target[key] !== undefined);
}

export async function getAirQualityData(location) {
  const { lat, lng } = location;
  const data = await requestWithRetry(async () => {
    const response = await api.get('/air/latest', {
      params: { lat, lng },
    });
    return response.data;
  });

  const values = data?.values || {};
  const required = ['us_aqi', 'pm2_5', 'pm10', 'no2', 'o3', 'co', 'timestamp'];
  const source = hasAllKeys(values, required) ? 'real' : 'unavailable';

  return {
    ...data,
    source,
  };
}

export async function getWeatherData(location) {
  const { lat, lng } = location;
  const data = await requestWithRetry(async () => {
    const response = await api.get('/weather/latest', {
      params: { lat, lng },
    });
    return response.data;
  });

  const values = data?.values || {};
  const required = ['temperature', 'humidity', 'windspeed', 'timestamp'];
  const source = hasAllKeys(values, required) ? 'real' : 'unavailable';

  return {
    ...data,
    source,
  };
}

export async function subscribeToAlerts(dataToSend) {
  try {
    const { data } = await api.post('/alerts/subscribe', dataToSend);
    return data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getHistoricalMerra2Data({ lat, lng, date, hour = 12 }) {
  return requestWithRetry(async () => {
    const { data } = await api.get('/historical/merra2', {
      params: {
        lat,
        lng,
        date,
        hour,
      },
    });
    return data;
  });
}

// Función para buscar ciudades
export async function searchCities(query, limit = 10) {
  return requestWithRetry(async () => {
    const { data } = await api.get('/cities/search', {
      params: { q: query, limit },
    });
    return data;
  });
}

export async function getAirQualityPoints() {
  try {
    const data = await requestWithRetry(async () => {
      const response = await api.get('/air/points', { timeout: 10000 });
      return response.data;
    }, { attempts: 1, initialDelayMs: 500 });

    return {
      geojson: data,
      source: 'real',
      message: null,
    };
  } catch (error) {
    const normalized = normalizeApiError(error);
    return {
      geojson: {
        type: 'FeatureCollection',
        features: [],
      },
      source: 'unavailable',
      message: normalized.message,
    };
  }
}
export default api;