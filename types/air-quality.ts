export type DataSourceStatus = 'real' | 'mock' | 'unavailable';

export interface LiveAirValues {
  us_aqi?: number | null;
  pm2_5?: number | null;
  pm10?: number | null;
  no2?: number | null;
  o3?: number | null;
  co?: number | null;
  timestamp?: string | null;
}

export interface LiveWeatherValues {
  temperature?: number | null;
  humidity?: number | null;
  windspeed?: number | null;
}

export interface AirQualityApiResponse {
  source?: DataSourceStatus;
  values?: LiveAirValues;
}

export interface WeatherApiResponse {
  values?: LiveWeatherValues;
}

export interface AirQualityViewData {
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  co: number | null;
  timestamp: string | null;
  weather: {
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
  };
}

export interface SelectedLocation {
  lat: number;
  lng: number;
  name: string;
}
