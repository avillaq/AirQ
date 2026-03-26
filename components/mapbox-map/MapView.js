'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import './MapView.css';
import { getAirQualityPoints, getHistoricalMerra2Data, searchCities } from '../../api';

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (!token) console.error('Missing NEXT_PUBLIC_MAPBOX_TOKEN');
mapboxgl.accessToken = token || '';

export default function MapView({
  center = [-74.08175, 4.60971],
  zoom = 3.2,
  refreshMs = 60000,
  allowRecenter = true,
  airQualityData = null,
  locationName = 'Unknown location',
  dataSourceStatus = 'unavailable',
  dataStatusMessage = ''
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const userInteractedRef = useRef(false);
  const pendingCenterRef = useRef(center);

  const [showHistoricalSearch, setShowHistoricalSearch] = useState(false);
  const [historicalData, setHistoricalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchDate, setSearchDate] = useState('');
  const [searchHour, setSearchHour] = useState('12');

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.length > 1) {
        try {
          const result = await searchCities(searchQuery, 10);
          setSuggestions(result.cities || []);
          setShowSuggestions(true);
        } catch (err) {
          console.error('Error searching cities:', err);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const handleHistoricalSearch = async () => {
    if (!selectedLocation || !searchDate) {
      setError('Please select a location and date');
      return;
    }

    try {
      setError(null);
      const result = await getHistoricalMerra2Data({
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        date: searchDate,
        hour: parseInt(searchHour)
      });

      setHistoricalData(result);
      
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [selectedLocation.lng, selectedLocation.lat],
          zoom: 8,
          duration: 2000
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch historical data');
      console.error('Historical data error:', err);
    }
  };


  const loadData = useCallback(async () => {
    if (!mapRef.current) return;

    const result = await getAirQualityPoints();
    const src = mapRef.current.getSource('air-points');

    if (!src) return;

    src.setData(result.geojson);

    if (result.source === 'real') {
      setError(null);
    } else if (result.source === 'unavailable') {
      setError(result.message || 'Map data unavailable');
    } else {
      setError('Using demo data');
    }
  }, []);

const resetMap = useCallback(() => {
  if (!mapRef.current) return;
  
  console.log('🔄 Reseteando mapa...');
  
  mapRef.current.flyTo({
    center: [-74.08175, 4.60971], 
    zoom: 2.5, 
    duration: 2000
  });
  
  userInteractedRef.current = false;
  
  setHistoricalData(null);
  setShowHistoricalSearch(false);
  
  setTimeout(() => {
    loadData();
  }, 500); 
  
  console.log('✅ Mapa reseteado');
}, [loadData]);

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

    ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'].forEach(ev => {
      map.on(ev, () => {
        userInteractedRef.current = true;
      });
    });

    map.on('load', () => {
      map.addSource('air-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
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
          'circle-color': [
            'step',
            ['get', 'aqi'],
            '#2ecc71', // Good: 0-50
            51, '#f1c40f', // Moderate: 51-100
            101, '#e67e22', // Unhealthy for sensitive: 101-150
            151, '#e74c3c', // Unhealthy: 151-200
            201, '#8e44ad', // Very unhealthy: 201-300
            301, '#6e2c00' // Hazardous: 301+
          ]
        }
      });

      // Add popup on hover
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

      map.on('mousemove', 'air-circles', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = 'pointer';
        
        const aqi = f.properties.aqi;
        const pm25 = f.properties.pm25 || 'N/A';
        const lastUpdate = f.properties.lastUpdate || 'Unknown';
        
        // Determinar color según AQI
        let aqiColor = '#2ecc71';
        let aqiStatus = 'Good';
        
        if (aqi > 300) {
          aqiColor = '#6e2c00';
          aqiStatus = 'Hazardous';
        } else if (aqi > 200) {
          aqiColor = '#8e44ad';
          aqiStatus = 'Very Unhealthy';
        } else if (aqi > 150) {
          aqiColor = '#e74c3c';
          aqiStatus = 'Unhealthy';
        } else if (aqi > 100) {
          aqiColor = '#e67e22';
          aqiStatus = 'Unhealthy for Sensitive';
        } else if (aqi > 50) {
          aqiColor = '#f1c40f';
          aqiStatus = 'Moderate';
        }
        
        popup
          .setLngLat(f.geometry.coordinates)
          .setHTML(`
            <div style="font-size:13px; padding: 8px; min-width: 200px;">
              <div style="font-weight:700; font-size:14px; margin-bottom: 8px; color: #333;">
                ${f.properties.name || 'Location'}
              </div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <div>
                  <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">AQI</div>
                  <div style="font-size: 24px; font-weight: 800; color: ${aqiColor};">${aqi}</div>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 12px; font-weight: 600; color: ${aqiColor};">${aqiStatus}</div>
                  <div style="font-size: 11px; color: #666;">PM2.5: ${pm25} µg/m³</div>
                </div>
              </div>
              <div style="font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 6px; margin-top: 6px;">
                ${lastUpdate.includes('Estimated') ? '📊 Estimated data' : `Updated: ${lastUpdate}`}
              </div>
            </div>
          `)
          .addTo(map);
      });
      map.on('mouseleave', 'air-circles', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      // Initial data load
      loadData();
      
      // Set up auto-refresh
      if (refreshMs && refreshMs > 0) {
        intervalRef.current = setInterval(loadData, refreshMs);
      }
    });

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, refreshMs, token, loadData]);

  // Handle center changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (!allowRecenter) return;

    const prev = pendingCenterRef.current;
    const next = center;
    const dist = Math.sqrt(
      Math.pow(prev[0] - next[0], 2) +
      Math.pow(prev[1] - next[1], 2)
    );

    // Only recenter if user hasn't interacted and distance is significant
    if (dist > 0.01 && !userInteractedRef.current) {
      mapRef.current.easeTo({ center: next, duration: 6000 });
      pendingCenterRef.current = next;
    }
  }, [center, allowRecenter]);

  if (!token) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: 'rgba(239, 68, 68, 0.15)', 
        color: '#fca5a5', 
        borderRadius: 12,
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        Missing Mapbox token
      </div>
    );
  }

  return (
    <div className="map-wrapper">
      <button
        type="button"
        className="map-refresh-btn"
        onClick={resetMap}
        title="Refresh data"
      >
        Refresh
      </button>

      {/* Botón para toggle búsqueda histórica */}
      <button
        type="button"
        className="map-historical-btn"
        onClick={() => setShowHistoricalSearch(!showHistoricalSearch)}
        title="Historical Data Search"
      >
        {showHistoricalSearch ? 'Hide Historical' : 'Show Historical'}
      </button>

      {/* Panel de búsqueda histórica */}
      {showHistoricalSearch && (
        <div className="historical-search-panel">
          <h3 className="historical-title">Historical Weather Data (MERRA2)</h3>
          
          <div className="search-input-group">
            <label>Location</label>
            <input
              type="text"
              placeholder="Search city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="historical-input"
            />
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="city-suggestions">
                {suggestions.map((city, idx) => (
                  <div
                    key={idx}
                    className="suggestion-item"
                    onClick={() => {
                      setSelectedLocation(city);
                      setSearchQuery(`${city.city}, ${city.country}`);
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="city-name">{city.city}</span>
                    <span className="country-name">{city.country}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="search-input-group">
            <label>Date</label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              min="1980-01-01"
              max={new Date().toISOString().split('T')[0]}
              className="historical-input"
            />
          </div>

          <div className="search-input-group">
            <label>Hour (0-23)</label>
            <input
              type="number"
              min="0"
              max="23"
              value={searchHour}
              onChange={(e) => setSearchHour(e.target.value)}
              className="historical-input"
            />
          </div>

          <button
            onClick={handleHistoricalSearch}
            className="historical-search-btn"
            disabled={!selectedLocation || !searchDate}
          >
            Search Historical Data
          </button>
        </div>
      )}

      <div className="mapbox-container" ref={containerRef} />
      
      <Legend />
      
      {historicalData ? (
        <HistoricalMetrics data={historicalData} />
      ) : (
        airQualityData && (
          <CompactMetrics
            data={airQualityData}
            locationName={locationName}
            sourceStatus={dataSourceStatus}
            sourceMessage={dataStatusMessage}
          />
        )
      )}
      
      {error && (
        <div className="map-error-badge">
          {error}
        </div>
      )}
    </div>
  );
}

// AQI Legend component
function Legend() {
  const items = [
    { c: '#2ecc71', l: '0–50' },
    { c: '#f1c40f', l: '51–100' },
    { c: '#e67e22', l: '101–150' },
    { c: '#e74c3c', l: '151–200' },
    { c: '#8e44ad', l: '201–300' },
    { c: '#6e2c00', l: '301+' }
  ];
  
  return (
    <div className="map-legend">
      <div className="legend-title">AQI Levels</div>
      {items.map(i => (
        <div key={i.l} className="legend-row">
          <span className="legend-color" style={{ background: i.c }} />
          {i.l}
        </div>
      ))}
    </div>
  );
}

// Compact metrics display component
function CompactMetrics({ data, locationName, sourceStatus, sourceMessage }) {
  // Determine AQI status and styling
  const getAQIStatus = (aqi) => {
    if (aqi === null || aqi === undefined) return { status: 'Unavailable', color: '#9ca3af', icon: '⚪' };
    if (aqi <= 50) return { status: 'Good', color: '#00e676', icon: '😊' };
    if (aqi <= 100) return { status: 'Moderate', color: '#ffeb3b', icon: '😐' };
    if (aqi <= 150) return { status: 'Unhealthy', color: '#ff9800', icon: '😷' };
    if (aqi <= 200) return { status: 'Unhealthy', color: '#f44336', icon: '😨' };
    if (aqi <= 300) return { status: 'Very Unhealthy', color: '#9c27b0', icon: '🤢' };
    return { status: 'Hazardous', color: '#8d6e63', icon: '☠️' };
  };

  const aqiInfo = getAQIStatus(data.aqi);

  return (
    <div className="compact-metrics">
      {/* Header with location and time */}
      <div className="compact-header">
        <div className="compact-location">
          <span className="location-text">{locationName}</span>
        </div>
        <div className="compact-time">
          {data.timestamp ? new Date(data.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit', 
            minute: '2-digit' 
          }) : 'No timestamp'}
        </div>
      </div>

      <div className={`source-chip source-chip-${sourceStatus}`}>
        {sourceStatus === 'real' ? 'Live data' : sourceStatus === 'mock' ? 'Demo data' : 'Data unavailable'}
      </div>

      {sourceMessage ? (
        <div className="source-message">{sourceMessage}</div>
      ) : null}

      {/* Main AQI display */}
      <div className="compact-aqi" style={{ borderLeftColor: aqiInfo.color }}>
        <div className="aqi-icon">{aqiInfo.icon}</div>
        <div className="aqi-content">
          <div className="aqi-value-compact" style={{ color: aqiInfo.color }}>
            {data.aqi ?? '--'}
          </div>
          <div className="aqi-label-compact">{aqiInfo.status}</div>
        </div>
      </div>

      {/* Pollutant metrics grid */}
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

      {/* Weather information */}
      <div className="compact-weather">
        <div className="weather-compact">
          <span>🌡️</span>
          <span>{data.weather.temperature ?? '--'}°C</span>
        </div>
        <div className="weather-compact">
          <span>💧</span>
          <span>{data.weather.humidity ?? '--'}%</span>
        </div>
        <div className="weather-compact">
          <span>💨</span>
          <span>{data.weather.windSpeed ?? '--'} km/h</span>
        </div>
      </div>
    </div>
  );
}

function HistoricalMetrics({ data }) {
  // Convertir temperatura de Kelvin a Celsius
  const tempCelsius = data.values.temperature_2m 
    ? (data.values.temperature_2m - 273.15).toFixed(1)
    : 'N/A';

  // Calcular velocidad del viento desde componentes U y V
  const windU = data.values.wind_u_10m || 0;
  const windV = data.values.wind_v_10m || 0;
  const windSpeed = Math.sqrt(windU ** 2 + windV ** 2).toFixed(1);

  // Convertir humedad específica a relativa (aproximación)
  const humidity = data.values.humidity_2m 
    ? (data.values.humidity_2m * 100).toFixed(1)
    : 'N/A';

  return (
    <div className="compact-metrics historical-metrics">
      <div className="compact-header">
        <div className="compact-location">
          <span className="location-text"> Historical Data</span>
        </div>
        <div className="compact-time">
          {data.datetime.date} at {data.datetime.hour}:00
        </div>
      </div>

      <div className="historical-location-info">
        <strong>Location:</strong> {data.location.lat.toFixed(2)}°, {data.location.lng.toFixed(2)}°
      </div>

      <div className="compact-grid">
        <div className="compact-metric">
          <span className="metric-label">Temp (°C)</span>
          <span className="metric-value-compact">{tempCelsius}</span>
        </div>
        <div className="compact-metric">
          <span className="metric-label">Humidity</span>
          <span className="metric-value-compact">{humidity}%</span>
        </div>
        <div className="compact-metric">
          <span className="metric-label">Wind (m/s)</span>
          <span className="metric-value-compact">{windSpeed}</span>
        </div>
      </div>

      <div className="historical-note">
        ℹ️ Data from NASA MERRA-2 Reanalysis
      </div>
    </div>
  );
}