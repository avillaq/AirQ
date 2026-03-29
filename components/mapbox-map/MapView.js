'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { AlertTriangle, Droplets, Frown, LocateFixed, MapPin, Meh, MinusCircle, Search, Skull, Smile, Thermometer, Wind } from 'lucide-react';
import './MapView.css';
import { getAirQualityPoints, searchCities } from '../../api';
import { US_AQI_MAPBOX_COLOR_EXPRESSION, getUsAqiCategory } from '@/lib/aqi';

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (!token) console.error('Falta NEXT_PUBLIC_MAPBOX_TOKEN');
mapboxgl.accessToken = token || '';

const SELECTED_LOCATION_SOURCE_ID = 'selected-location';
const SELECTED_LOCATION_HALO_LAYER_ID = 'selected-location-halo';
const SELECTED_LOCATION_CORE_LAYER_ID = 'selected-location-core';

function buildSelectedLocationGeoJson(center, locationName, aqi) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: center,
        },
        properties: {
          name: locationName,
          aqi,
        },
      },
    ],
  };
}

export default function MapView({
  center = [-74.08175, 4.60971],
  zoom = 3.2,
  refreshMs = 1800000,
  allowRecenter = true,
  airQualityData = null,
  locationName = 'Ubicacion desconocida',
  dataSourceStatus = 'unavailable',
  dataStatusMessage = '',
  onLocationSelect = () => {}
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const intervalRef = useRef(null);
  const citySearchCacheRef = useRef(new Map());
  const pendingCenterRef = useRef(center);
  const [isLocating, setIsLocating] = useState(false);

  const [searchQuery, setSearchQuery] = useState(locationName);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setSearchQuery(locationName);
  }, [locationName]);

  const resolveLocationName = useCallback(async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,country&language=es&access_token=${mapboxgl.accessToken}`
      );

      if (!response.ok) {
        return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
      }

      const payload = await response.json();
      const features = payload?.features || [];

      const place = features.find((feature) => feature.place_type?.includes('place'));
      const country = features.find((feature) => feature.place_type?.includes('country'));

      if (place?.text && country?.text) {
        return `${place.text}, ${country.text}`;
      }

      if (country?.text) {
        return country.text;
      }

      return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    } catch {
      return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    }
  }, []);

  const requestUserLocation = useCallback((showDenyError = true) => {
    if (!navigator.geolocation) {
      if (showDenyError) {
        setLocationError('Tu navegador no soporta geolocalizacion.');
      }
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        const resolvedName = await resolveLocationName(lat, lng);

        onLocationSelect({ lat, lng, name: resolvedName });
        setSearchQuery(resolvedName);
        setShowSuggestions(false);
        setIsLocating(false);
      },
      () => {
        if (showDenyError) {
          setLocationError('No se pudo obtener tu ubicacion. Puedes buscar manualmente.');
        }
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, [onLocationSelect, resolveLocationName]);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      const query = searchQuery.trim();
      if (query.length > 1) {
        const normalizedQuery = query.toLowerCase();
        if (normalizedQuery === locationName.toLowerCase()) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        const cachedSuggestions = citySearchCacheRef.current.get(normalizedQuery);
        if (cachedSuggestions) {
          setSuggestions(cachedSuggestions);
          setShowSuggestions(cachedSuggestions.length > 0);
          return;
        }

        try {
          const result = await searchCities(query, 10);
          const nextSuggestions = result.cities || [];
          citySearchCacheRef.current.set(normalizedQuery, nextSuggestions);
          setSuggestions(nextSuggestions);
          setShowSuggestions(nextSuggestions.length > 0);
        } catch (err) {
          console.error('Error al buscar ciudades:', err);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, locationName]);

  const loadData = useCallback(async () => {
    if (!mapRef.current) return;

    const result = await getAirQualityPoints();
    const src = mapRef.current.getSource('air-points');

    if (!src) return;

    src.setData(result.geojson);

    if (result.source === 'real') {
      setError(null);
    } else if (result.source === 'unavailable') {
      setError(result.message || 'Datos del mapa no disponibles');
    } else {
      setError('Usando datos de demostracion');
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom,
      pitch: 0,
      bearing: 0,
      maxZoom: 12,
      minZoom: 2
    });

    const map = mapRef.current;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
    
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.on('load', () => {
      map.addSource('air-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addSource(SELECTED_LOCATION_SOURCE_ID, {
        type: 'geojson',
        data: buildSelectedLocationGeoJson(center, locationName, airQualityData?.aqi ?? null),
      });

      map.addLayer({
        id: 'air-circles',
        type: 'circle',
        source: 'air-points',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'aqi'],
            0, 5,
            300, 14
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#111',
          'circle-color': US_AQI_MAPBOX_COLOR_EXPRESSION
        }
      });

      map.addLayer({
        id: SELECTED_LOCATION_HALO_LAYER_ID,
        type: 'circle',
        source: SELECTED_LOCATION_SOURCE_ID,
        paint: {
          'circle-radius': 12,
          'circle-color': 'rgba(120, 252, 214, 0.22)',
          'circle-stroke-width': 0,
        },
      });

      map.addLayer({
        id: SELECTED_LOCATION_CORE_LAYER_ID,
        type: 'circle',
        source: SELECTED_LOCATION_SOURCE_ID,
        paint: {
          'circle-radius': 6,
          'circle-color': US_AQI_MAPBOX_COLOR_EXPRESSION,
          'circle-stroke-color': '#0f1211',
          'circle-stroke-width': 2,
        },
      });

      map.on('mouseenter', 'air-circles', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'air-circles', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('click', 'air-circles', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coordinates = f.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) return;

        const [lng, lat] = coordinates;
        const nextName = f.properties?.name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
        setSearchQuery(nextName);
        setShowSuggestions(false);
        onLocationSelect({ lat, lng, name: nextName });
      });

      map.on('mouseenter', SELECTED_LOCATION_CORE_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', SELECTED_LOCATION_CORE_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });

      loadData();
      
      if (refreshMs && refreshMs > 0) {
        intervalRef.current = setInterval(loadData, refreshMs);
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [refreshMs, token, loadData]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!allowRecenter) return;

    const prev = pendingCenterRef.current;
    const next = center;
    const dist = Math.sqrt(
      Math.pow(prev[0] - next[0], 2) +
      Math.pow(prev[1] - next[1], 2)
    );

    const selectedLocationSource = mapRef.current.getSource(SELECTED_LOCATION_SOURCE_ID);
    if (selectedLocationSource) {
      selectedLocationSource.setData(
        buildSelectedLocationGeoJson(next, locationName, airQualityData?.aqi ?? null)
      );
    }

    if (dist > 0.01) {
      mapRef.current.easeTo({ center: next, zoom: 7, duration: 1800 });
      pendingCenterRef.current = next;
    }
  }, [center, allowRecenter, locationName, airQualityData?.aqi]);

  if (!token) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: 'rgba(239, 68, 68, 0.15)', 
        color: '#fca5a5', 
        borderRadius: 12,
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        Falta el token de Mapbox
      </div>
    );
  }

  return (
    <div className="map-wrapper">
      <div className="live-search-panel">
        <div className="live-search-row">
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar ciudad o pais..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="live-search-input"
          />
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="city-suggestions">
            {suggestions.map((city, idx) => (
              <div
                key={idx}
                className="suggestion-item"
                onClick={() => {
                  const nextName = `${city.city}, ${city.country}`;
                  setSearchQuery(nextName);
                  setShowSuggestions(false);
                  onLocationSelect({ lat: city.lat, lng: city.lng, name: nextName });
                }}
              >
                <span className="city-name">{city.city}</span>
                <span className="country-name">{city.country}</span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="map-locate-btn"
          onClick={() => requestUserLocation(true)}
          disabled={isLocating}
        >
          <LocateFixed size={14} />
          {isLocating ? 'Ubicando...' : 'Usar mi ubicacion'}
        </button>
      </div>

      <div className="mapbox-container" ref={containerRef} />

      {airQualityData && (
        <Metrics
          data={airQualityData}
          locationName={locationName}
          sourceStatus={dataSourceStatus}
          sourceMessage={dataStatusMessage}
        />
      )}
      
      {error && (
        <div className="map-error-badge">
          {error}
        </div>
      )}

      {locationError && (
        <div className="map-location-error-badge">
          {locationError}
        </div>
      )}
    </div>
  );
}

function Metrics({ data, locationName, sourceStatus, sourceMessage }) {
  const getAQIStatus = (aqi) => {
    const category = getUsAqiCategory(aqi);

    if (category.key === 'unavailable') {
      return { status: category.labelEs, color: category.colorHex, icon: MinusCircle };
    }

    if (category.key === 'good') return { status: category.labelEs, color: category.colorHex, icon: Smile };
    if (category.key === 'moderate') return { status: category.labelEs, color: category.colorHex, icon: Meh };
    if (category.key === 'unhealthy-sensitive') return { status: category.labelEs, color: category.colorHex, icon: Frown };
    if (category.key === 'unhealthy') return { status: category.labelEs, color: category.colorHex, icon: AlertTriangle };
    if (category.key === 'very-unhealthy') return { status: category.labelEs, color: category.colorHex, icon: AlertTriangle };
    return { status: category.labelEs, color: category.colorHex, icon: Skull };
  };

  const aqiInfo = getAQIStatus(data.aqi);

  return (
    <div className="compact-metrics">
      <div className="compact-header">
        <div className="compact-location">
          <MapPin size={14} />
          <span className="location-text">{locationName}</span>
        </div>
        <div className="compact-time">
          {data.timestamp ? new Date(data.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit', 
            minute: '2-digit' 
          }) : 'Sin marca de tiempo'}
        </div>
      </div>

      <div className={`source-chip source-chip-${sourceStatus}`}>
        {sourceStatus === 'real' ? 'Datos en vivo' : sourceStatus === 'mock' ? 'Datos de demostracion' : 'Datos no disponibles'}
      </div>

      {sourceMessage ? (
        <div className="source-message">{sourceMessage}</div>
      ) : null}

      <div className="compact-aqi" style={{ borderLeftColor: aqiInfo.color }}>
        <div className="aqi-icon"><aqiInfo.icon size={20} /></div>
        <div className="aqi-content">
          <div className="aqi-value-compact" style={{ color: aqiInfo.color }}>
            {data.aqi ?? '--'}
          </div>
          <div className="aqi-label-compact">{aqiInfo.status}</div>
        </div>
      </div>

      <div className="compact-grid">
        <div className="compact-metric">
          <span className="metric-label">PM2.5</span>
          <span className="metric-value-compact">{data.pm25 ?? '--'}</span>
        </div>
        <div className="compact-metric">
          <span className="metric-label">PM10</span>
          <span className="metric-value-compact">{data.pm10 ?? '--'}</span>
        </div>
        <div className="compact-metric">
          <span className="metric-label">NO₂</span>
          <span className="metric-value-compact">{data.no2 ?? '--'}</span>
        </div>
        <div className="compact-metric">
          <span className="metric-label">O₃</span>
          <span className="metric-value-compact">{data.o3 ?? '--'}</span>
        </div>
        <div className="compact-metric">
          <span className="metric-label">CO</span>
          <span className="metric-value-compact">{data.co ?? '--'}</span>
        </div>
      </div>

      <div className="compact-weather">
        <div className="weather-compact">
          <Thermometer size={14} />
          <span>{data.weather.temperature ?? '--'}°C</span>
        </div>
        <div className="weather-compact">
          <Droplets size={14} />
          <span>{data.weather.humidity ?? '--'}%</span>
        </div>
        <div className="weather-compact">
          <Wind size={14} />
          <span>{data.weather.windSpeed ?? '--'} km/h</span>
        </div>
      </div>
    </div>
  );
}

