'use client'

import { useState, useEffect } from 'react';
import { getAirQualityData, getWeatherData } from '../api';
import MapView from "./mapbox-map/MapView"

export function MapBox() {

  const [airQualityData, setAirQualityData] = useState<any>(null);
  const [dataSourceStatus, setDataSourceStatus] = useState<'real' | 'mock' | 'unavailable'>('unavailable');
  const [dataStatusMessage, setDataStatusMessage] = useState('Cargando datos en vivo...');
  const [selectedLocation, setSelectedLocation] = useState({
    lat: -16.409,
    lng: -71.5375,
    name: 'Arequipa, Peru'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [airQuality, weather] = await Promise.all([
          getAirQualityData(selectedLocation),
          getWeatherData(selectedLocation)
        ]);

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
          const data: any = {
            aqi: valuesAir.us_aqi,
            pm25: valuesAir.pm2_5,
            pm10: valuesAir.pm10,
            no2: valuesAir.no2,
            o3: valuesAir.o3,
            co: valuesAir.co,
            timestamp: valuesAir.timestamp,
            weather: {
              temperature: valuesWeather.temperature,
              humidity: valuesWeather.humidity,
              windSpeed: valuesWeather.windspeed,
            }
          };

          setAirQualityData(data);
          setDataSourceStatus('real');
          setDataStatusMessage('Mediciones en vivo');
          return;
        }

        setAirQualityData({
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
        });
        setDataSourceStatus('unavailable');
        setDataStatusMessage('Los datos en vivo están incompletos para esta ubicación en este momento');
      } catch (error: any) {
        setAirQualityData({
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
        });
        setDataSourceStatus('unavailable');
        setDataStatusMessage(error?.message || 'No se pudieron obtener datos en vivo');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000 * 10);

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
      />
    </section>
  )
}