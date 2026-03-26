'use client'

import { useState, useEffect } from 'react';
import { getAirQualityData, getWeatherData } from '../api';
import MapView from "./mapbox-map/MapView"

export function MapBox() {

  const [airQualityData, setAirQualityData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState({
    lat: -16.409,
    lng: -71.5375,
    name: 'Arequipa, Peru'
  });

  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.all([
        getAirQualityData(selectedLocation),
        getWeatherData(selectedLocation)
      ]);

      const [airQuality, weather] = results;

      const data: any = {
        aqi: airQuality.values.us_aqi || Math.floor(Math.random() * 200) + 50,
        pm25: airQuality.values.pm2_5 || Math.floor(Math.random() * 50) + 10,
        pm10: airQuality.values.pm10 || Math.floor(Math.random() * 100) + 20,
        no2: airQuality.values.no2 || Math.floor(Math.random() * 80) + 10,
        o3: airQuality.values.o3 || Math.floor(Math.random() * 150) + 50,
        co: airQuality.values.co || Math.floor(Math.random() * 10) + 1,
        timestamp: airQuality.values.timestamp || new Date().toISOString(),
        weather: {
          temperature: weather.values.temperature || Math.floor(Math.random() * 30) + 10,
          humidity: weather.values.humidity || Math.floor(Math.random() * 40) + 40,
          windSpeed: weather.values.windspeed || Math.floor(Math.random() * 20) + 5
        }
      };

      setAirQualityData(data);
    };

    fetchData();
    const interval = setInterval(fetchData, 60000 * 10);

    return () => clearInterval(interval);
  }, [selectedLocation]);

  return (
    <section className="w-full">
      <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-6 text-center">
        Air Quality Map
      </h3>
      <MapView
        center={[selectedLocation.lng, selectedLocation.lat]}
        airQualityData={airQualityData}
        locationName={selectedLocation.name}
      />
    </section>
  )
}