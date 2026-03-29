'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAirQualityData, getWeatherData } from '../api';
import MapView from "./mapbox-map/MapView"
import type {
  AirQualityApiResponse,
  AirQualityViewData,
  DataSourceStatus,
  SelectedLocation,
  WeatherApiResponse,
} from '@/types/air-quality';

const ACTIVE_LOCATION_REFRESH_MS = 30 * 60 * 1000;

function toLocationCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

export function MapBox() {

  const [airQualityData, setAirQualityData] = useState<AirQualityViewData | null>(null);
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus>('unavailable');
  const [dataStatusMessage, setDataStatusMessage] = useState('Cargando datos en vivo...');
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>({
    lat: -12.0464,
    lng: -77.0428,
    name: 'Lima, Peru'
  });

  const detailsCacheRef = useRef<Map<string, {
    expiresAt: number;
    airQualityData: AirQualityViewData;
    dataSourceStatus: DataSourceStatus;
    dataStatusMessage: string;
  }>>(new Map());

  const handleLocationSelect = useCallback((location?: SelectedLocation) => {
    if (!location) return;

    setSelectedLocation((previous) => {
      const sameCoords =
        Math.abs(previous.lat - location.lat) < 0.0001 &&
        Math.abs(previous.lng - location.lng) < 0.0001;
      const sameName = previous.name === location.name;

      if (sameCoords && sameName) {
        return previous;
      }

      return location;
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const cacheKey = toLocationCacheKey(selectedLocation.lat, selectedLocation.lng);
      const cached = detailsCacheRef.current.get(cacheKey);
      const now = Date.now();

      if (cached && cached.expiresAt > now) {
        setAirQualityData(cached.airQualityData);
        setDataSourceStatus(cached.dataSourceStatus);
        setDataStatusMessage(cached.dataStatusMessage);
        return;
      }

      try {
        const [airQuality, weather] = (await Promise.all([
          getAirQualityData(selectedLocation),
          getWeatherData(selectedLocation)
        ])) as [AirQualityApiResponse, WeatherApiResponse];

        const valuesAir = airQuality?.values || {};
        const valuesWeather = weather?.values || {};

        const hasFullAir = [
          valuesAir.us_aqi,
          valuesAir.pm2_5,
          valuesAir.pm10,
          valuesAir.no2,
          valuesAir.o3,
          valuesAir.co,
          valuesAir.timestamp,
        ].every((value) => value !== null && value !== undefined);

        const hasFullWeather = [
          valuesWeather.temperature,
          valuesWeather.humidity,
          valuesWeather.windspeed,
        ].every((value) => value !== null && value !== undefined);

        if (hasFullAir && hasFullWeather) {
          const data: AirQualityViewData = {
            aqi: valuesAir.us_aqi ?? null,
            pm25: valuesAir.pm2_5 ?? null,
            pm10: valuesAir.pm10 ?? null,
            no2: valuesAir.no2 ?? null,
            o3: valuesAir.o3 ?? null,
            co: valuesAir.co ?? null,
            timestamp: valuesAir.timestamp ?? null,
            weather: {
              temperature: valuesWeather.temperature ?? null,
              humidity: valuesWeather.humidity ?? null,
              windSpeed: valuesWeather.windspeed ?? null,
            }
          };

          setAirQualityData(data);
          setDataSourceStatus('real');
          setDataStatusMessage('Mediciones en vivo');

          detailsCacheRef.current.set(cacheKey, {
            expiresAt: now + ACTIVE_LOCATION_REFRESH_MS,
            airQualityData: data,
            dataSourceStatus: 'real',
            dataStatusMessage: 'Mediciones en vivo',
          });
          return;
        }

        const unavailableData: AirQualityViewData = {
          aqi: null,
          pm25: null,
          pm10: null,
          no2: null,
          o3: null,
          co: null,
          timestamp: null,
          weather: {
            temperature: null,
            humidity: null,
            windSpeed: null,
          }
        };

        setAirQualityData(unavailableData);
        setDataSourceStatus('unavailable');
        setDataStatusMessage('Los datos en vivo están incompletos para esta ubicación en este momento');

        detailsCacheRef.current.set(cacheKey, {
          expiresAt: now + ACTIVE_LOCATION_REFRESH_MS,
          airQualityData: unavailableData,
          dataSourceStatus: 'unavailable',
          dataStatusMessage: 'Los datos en vivo están incompletos para esta ubicación en este momento',
        });
      } catch (error: unknown) {
        const fallbackData: AirQualityViewData = {
          aqi: null,
          pm25: null,
          pm10: null,
          no2: null,
          o3: null,
          co: null,
          timestamp: null,
          weather: {
            temperature: null,
            humidity: null,
            windSpeed: null,
          }
        };

        setAirQualityData(fallbackData);
        setDataSourceStatus('unavailable');
        const message = error instanceof Error ? error.message : 'No se pudieron obtener datos en vivo';
        setDataStatusMessage(message);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, ACTIVE_LOCATION_REFRESH_MS);

    return () => clearInterval(interval);
  }, [selectedLocation]);

  return (
    <section id="map-section" className="w-full">
      <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-6 text-center">
        Mapa de calidad del aire
      </h3>
      <MapView
        center={[selectedLocation.lng, selectedLocation.lat]}
        airQualityData={airQualityData}
        locationName={selectedLocation.name}
        dataSourceStatus={dataSourceStatus}
        dataStatusMessage={dataStatusMessage}
        onLocationSelect={handleLocationSelect}
      />
    </section>
  )
}