'use client';

import { useEffect, useRef, useState } from "react";
import { getAirQualityData } from '../../api';
import Link from 'next/link';
import "./InteractiveMap.css";

const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN;

const AVATAR_STATES = {
  good: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='15' fill='%23fbbf24'/%3E%3Ccircle cx='45' cy='32' r='2' fill='%23000'/%3E%3Ccircle cx='55' cy='32' r='2' fill='%23000'/%3E%3Cpath d='M45 38 Q50 42 55 38' stroke='%23000' stroke-width='2' fill='none'/%3E%3Crect x='35' y='50' width='30' height='35' rx='15' fill='%2310b981'/%3E%3Ccircle cx='30' cy='60' r='8' fill='%23fbbf24'/%3E%3Ccircle cx='70' cy='60' r='8' fill='%23fbbf24'/%3E%3Crect x='42' y='85' width='6' height='15' fill='%23451a03'/%3E%3Crect x='52' y='85' width='6' height='15' fill='%23451a03'/%3E%3C/svg%3E",
  moderate: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='15' fill='%23fbbf24'/%3E%3Ccircle cx='45' cy='32' r='2' fill='%23000'/%3E%3Ccircle cx='55' cy='32' r='2' fill='%23000'/%3E%3Cline x1='45' y1='38' x2='55' y2='38' stroke='%23000' stroke-width='2'/%3E%3Crect x='35' y='50' width='30' height='35' rx='15' fill='%23f59e0b'/%3E%3Ccircle cx='30' cy='60' r='8' fill='%23fbbf24'/%3E%3Ccircle cx='70' cy='60' r='8' fill='%23fbbf24'/%3E%3Crect x='42' y='85' width='6' height='15' fill='%23451a03'/%3E%3Crect x='52' y='85' width='6' height='15' fill='%23451a03'/%3E%3C/svg%3E",
  unhealthy: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='15' fill='%23fbbf24'/%3E%3Ccircle cx='45' cy='32' r='2' fill='%23000'/%3E%3Ccircle cx='55' cy='32' r='2' fill='%23000'/%3E%3Cpath d='M45 42 Q50 38 55 42' stroke='%23000' stroke-width='2' fill='none'/%3E%3Crect x='35' y='50' width='30' height='35' rx='15' fill='%23ef4444'/%3E%3Ccircle cx='30' cy='60' r='8' fill='%23fbbf24'/%3E%3Ccircle cx='70' cy='60' r='8' fill='%23fbbf24'/%3E%3Crect x='42' y='85' width='6' height='15' fill='%23451a03'/%3E%3Crect x='52' y='85' width='6' height='15' fill='%23451a03'/%3E%3C/svg%3E",
  critical: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='15' fill='%23fbbf24'/%3E%3Ccircle cx='45' cy='32' r='2' fill='%23000'/%3E%3Ccircle cx='55' cy='32' r='2' fill='%23000'/%3E%3Cpath d='M45 42 Q50 38 55 42' stroke='%23000' stroke-width='2' fill='none'/%3E%3Crect x='35' y='50' width='30' height='35' rx='15' fill='%23ef4444'/%3E%3Ccircle cx='30' cy='60' r='8' fill='%23fbbf24'/%3E%3Ccircle cx='70' cy='60' r='8' fill='%23fbbf24'/%3E%3Crect x='42' y='85' width='6' height='15' fill='%23451a03'/%3E%3Crect x='52' y='85' width='6' height='15' fill='%23451a03'/%3E%3C/svg%3E"
};

function getAvatarModelPath(aqi) {
  if (aqi === null || aqi === undefined) return "/models/avatar_coughing.glb";
  if (aqi <= 25) return "/models/avatar_happy_1.glb";
  if (aqi <= 50) return "/models/avatar_greeting.glb";
  if (aqi <= 100) return "/models/avatar_coughing.glb";
  if (aqi <= 150) return "/models/avatar_sick.glb";
  return "/models/avatar_critical.glb";
}

function getLungModelPath(lungHealth) {
  if (lungHealth > 75) return "/models/lung_healthy.glb";
  if (lungHealth > 50) return "/models/lung_moderate.glb";
  if (lungHealth > 25) return "/models/lung_unhealthy.glb";
  return "/models/lung_dead.glb";
}

function getAQIClass(aqi) {
  if (aqi === null || aqi === undefined) return "aqi-unavailable";
  if (aqi <= 50) return "aqi-good";
  if (aqi <= 100) return "aqi-moderate";
  if (aqi <= 150) return "aqi-unhealthy";
  return "aqi-hazardous";
}

function getAQIText(aqi) {
  if (aqi === null || aqi === undefined) return "Unavailable";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Harmful";
  return "Hazardous";
}

function getAvatarState(aqi) {
  if (aqi === null || aqi === undefined) return { src: AVATAR_STATES.moderate, mood: "No Data" };
  if (aqi <= 50) return { src: AVATAR_STATES.good, mood: "Happy" };
  if (aqi <= 100) return { src: AVATAR_STATES.moderate, mood: "Coughing" };
  if (aqi <= 150) return { src: AVATAR_STATES.unhealthy, mood: "Sick" };
  return { src: AVATAR_STATES.critical, mood: "Dying" };
}

const InteractiveMap = () => {
  const cesiumContainer = useRef(null);
  const particlesContainer = useRef(null);
  const lungModelRef = useRef(null);
  const avatarModelViewerRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  const [lat, setLat] = useState(-16.409);
  const [lon, setLon] = useState(-71.5375);
  const [alt, setAlt] = useState(3000);
  const [aqi, setAqi] = useState(null);
  const [aqiSource, setAqiSource] = useState('unavailable');
  const [aqiStatusMessage, setAqiStatusMessage] = useState('Loading live AQI...');
  const [locationName, setLocationName] = useState("Arequipa, Peru");
  const [lungHealth, setLungHealth] = useState(100);
  const [timeInLocation, setTimeInLocation] = useState(0);
  const [coordsDisplay, setCoordsDisplay] = useState({
    lat: -16.409,
    lon: -71.5375,
    alt: 3000
  });
  const [isDragging, setIsDragging] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const viewerRef = useRef(null);
  const characterEntityRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetch('/worldcities.csv')
      .then(response => response.text())
      .then(data => {
        const lines = data.split('\n').slice(1);
        const parsedCities = lines.map(line => {
          const match = line.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
          if (match) {
            return {
              city: match[1],
              cityAscii: match[2],
              lat: parseFloat(match[3]),
              lng: parseFloat(match[4]),
              country: match[5]
            };
          }
          return null;
        }).filter(city => city !== null);
        setCities(parsedCities);
      })
      .catch(error => console.error('Error loading cities:', error));
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = cities
        .filter(city =>
          city.cityAscii.toLowerCase().includes(searchQuery.toLowerCase()) ||
          city.country.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10);
      setFilteredCities(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredCities([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, cities]);

  const handleCitySelect = (city) => {
    setLat(city.lat);
    setLon(city.lng);
    setAlt(3000);
    setSearchQuery(`${city.city}, ${city.country}`);
    setShowSuggestions(false);
    setLocationName(`${city.city}, ${city.country}`);

    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, 3000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 3
    });
    moveCharacterTo(city.lng, city.lat);
  };

  useEffect(() => {
    let CesiumScript = document.createElement("script");
    CesiumScript.src =
      "https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Cesium.js";
    CesiumScript.async = true;
    CesiumScript.onload = () => {
      window.CESIUM_BASE_URL =
        "https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/";
      window.Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;
      initCesium();
    };
    document.body.appendChild(CesiumScript);

    return () => {
      clearInterval(timerRef.current);
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeInLocation((t) => t + 1);
      if (timeInLocation % 3 === 0) {
        updateLungHealth();
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [aqi, timeInLocation]);

  const resetLocationTimer = () => {
    setTimeInLocation(0);
    setLungHealth((h) => Math.min(100, h + 2));
  };

  // if there is high aqi, lung health degrades faster
  const updateLungHealth = () => {
    if (aqi === null || aqi === undefined) return;
    const degradationRate = aqi > 100 ? 0.8 : 0.1;
    setLungHealth((h) => Math.max(0, h - degradationRate));
  };

  const initCesium = async () => {
    const Cesium = window.Cesium;
    const viewer = new Cesium.Viewer(cesiumContainer.current, {
      baseLayerPicker: false,
      geocoder: false,
      timeline: false,
      animation: false,
      shouldAnimate: true,
      terrainProvider: await Cesium.createWorldTerrainAsync()
    });
    viewerRef.current = viewer;

    try {
      const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
      viewer.scene.primitives.add(tileset);
    } catch (e) {
      console.error("Error loading tileset:", e);
    }

    createCharacterEntity(lon, lat);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      }
    });

    viewer.scene.globe.enableLighting = true;
    viewer.scene.skyAtmosphere.show = true;

    setupMouseEvents();
    setupAvatarDragDrop();
    updateAQIData(lon, lat);
  };

  const createCharacterEntity = (lon, lat) => {
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (characterEntityRef.current) {
      viewer.entities.remove(characterEntityRef.current);
    }

    const modelPath = getAvatarModelPath(aqi);
    const position = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
    const heading = Cesium.Math.toRadians(75);
    const pitch = 0;
    const roll = 0;
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

    characterEntityRef.current = viewer.entities.add({
      name: 'Avatar',
      position: position,
      orientation: orientation,
      model: {
        uri: modelPath,
        minimumPixelSize: 256,
        maximumScale: 400,
        scale: 20.0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
        colorBlendAmount: 0.0
      }
    });
  };

  useEffect(() => {
    if (!isMounted) return;

    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    if (characterEntityRef.current && viewer && characterEntityRef.current.model) {
      const modelPath = getAvatarModelPath(aqi);

      characterEntityRef.current.model.uri = modelPath;
    }

    if (avatarModelViewerRef.current) {
      const modelPath = getAvatarModelPath(aqi);
      avatarModelViewerRef.current.setAttribute('src', modelPath);

      if (aqi > 150) {
        avatarModelViewerRef.current.style.filter = 'saturate(1.2) brightness(0.9)';
      } else if (aqi > 100) {
        avatarModelViewerRef.current.style.filter = 'saturate(1.1) brightness(0.95)';
      } else if (aqi > 50) {
        avatarModelViewerRef.current.style.filter = 'saturate(1.05)';
      } else {
        avatarModelViewerRef.current.style.filter = 'brightness(1)';
      }
    }
  }, [aqi, isMounted]);


  const setupMouseEvents = () => {
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(function (movement) {
      const cartesian = viewer.camera.pickEllipsoid(
        movement.endPosition,
        viewer.scene.globe.ellipsoid
      );
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        setCoordsDisplay({
          lat: Number(Cesium.Math.toDegrees(cartographic.latitude)).toFixed(4),
          lon: Number(Cesium.Math.toDegrees(cartographic.longitude)).toFixed(4),
          alt: Math.round(viewer.camera.positionCartographic.height)
        });
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction(function (click) {
      if (isDragging) return;

      const cartesian = viewer.camera.pickEllipsoid(
        click.position,
        viewer.scene.globe.ellipsoid
      );
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const newLat = Cesium.Math.toDegrees(cartographic.latitude);
        const newLon = Cesium.Math.toDegrees(cartographic.longitude);
        moveCharacterTo(newLon, newLat);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  };

  const setupAvatarDragDrop = () => {
    const cesiumContainerDiv = cesiumContainer.current;
    if (!cesiumContainerDiv) return;

    cesiumContainerDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    cesiumContainerDiv.addEventListener('drop', (e) => {
      e.preventDefault();

      const rect = cesiumContainerDiv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const Cesium = window.Cesium;
      const viewer = viewerRef.current;
      if (!viewer) return;

      const cartesian = viewer.camera.pickEllipsoid(
        new Cesium.Cartesian2(x, y),
        viewer.scene.globe.ellipsoid
      );

      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const newLat = Cesium.Math.toDegrees(cartographic.latitude);
        const newLon = Cesium.Math.toDegrees(cartographic.longitude);

        moveCharacterTo(newLon, newLat);
      }

      setIsDragging(false);
    });
  };

  const moveCharacterTo = (newLon, newLat) => {
    const Cesium = window.Cesium;
    if (!characterEntityRef.current) return;

    characterEntityRef.current.position = Cesium.Cartesian3.fromDegrees(
      newLon,
      newLat,
      10
    );

    setLat(newLat);
    setLon(newLon);
    updateAQIData(newLon, newLat);
    resetLocationTimer();
    createParticleAnimation();
  };

  const updateAQIData = async (lon, lat) => {
    try {
      const selectedLocation = { lat, lng: lon };
      const airQuality = await getAirQualityData(selectedLocation);
      const aqiValue = airQuality?.values?.us_aqi;

      if (aqiValue === null || aqiValue === undefined) {
        setAqi(null);
        setAqiSource('unavailable');
        setAqiStatusMessage('AQI not available for this location');
      } else {
        setAqi(aqiValue);
        setAqiSource(airQuality.source || 'real');
        setAqiStatusMessage('Live AQI');
      }

      setLocationName(`${lat.toFixed(3)}, ${lon.toFixed(3)}`);
    } catch (error) {
      setAqi(null);
      setAqiSource('unavailable');
      setAqiStatusMessage(error?.message || 'Network error while fetching AQI');
      setLocationName(`${lat.toFixed(3)}, ${lon.toFixed(3)}`);
    }
  };

  const createParticleAnimation = () => {
    if (!particlesContainer.current) return;
    if (aqi === null || aqi === undefined) return;
    particlesContainer.current.innerHTML = "";
    const particleCount = Math.floor(aqi / 10);

    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = Math.random() * 100 + "%";
        particle.style.top = Math.random() * 100 + "%";

        const opacity = 0.3 + (aqi / 200) * 0.5;
        if (aqi > 100) {
          particle.style.background = `rgba(239, 68, 68, ${opacity})`;
        } else if (aqi > 50) {
          particle.style.background = `rgba(245, 158, 11, ${opacity})`;
        } else {
          particle.style.background = `rgba(16, 185, 129, ${opacity})`;
        }

        if (particlesContainer.current) {
          particlesContainer.current.appendChild(particle);
        }

        setTimeout(() => {
          if (particlesContainer.current && particlesContainer.current.contains(particle)) {
            particlesContainer.current.removeChild(particle);
          }
        }, 3000);
      }, i * 100);
    }
  };

  const flyToLocation = () => {
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    if (!viewer || isNaN(lat) || isNaN(lon) || isNaN(alt)) {
      alert('Please enter valid coordinates.');
      return;
    }

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 3
    });
    moveCharacterTo(lon, lat);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Enter") flyToLocation();
      if (e.key === "Escape") {
        if (viewerRef.current) {
          viewerRef.current.entities.removeAll();
          createCharacterEntity(-71.5375, -16.409);
        }
        setLat(-16.409);
        setLon(-71.5375);
        setAlt(3000);
        setLungHealth(100);
        setAqi(null);
        setAqiSource('unavailable');
        setAqiStatusMessage('Loading live AQI...');
        setLocationName("Arequipa, Peru");
        setTimeInLocation(0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleAvatarDragStart = (e) => {
    setIsDragging(true);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAvatarDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setTimeout(() => setIsDragging(false), 100);
  };

  if (!isMounted) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(var(--background))'
      }}>
        <p style={{ color: 'hsl(var(--foreground))' }}>Loading map...</p>
      </div>
    );
  }

  const avatarState = getAvatarState(aqi);

  return (
    <div className="interactive-map-container">
      <div ref={cesiumContainer} id="cesiumContainer" />
      <div ref={particlesContainer} className="particles-container" />

      <Link href="/" className="home-link">
        <span className="home-text">Home</span>
      </Link>

      <div className="controls">
        <h3>Search City</h3>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search city or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
          />
          {showSuggestions && filteredCities.length > 0 && (
            <div className="suggestions-dropdown">
              {filteredCities.map((city, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleCitySelect(city)}
                >
                  <span className="city-name">{city.city}</span>
                  <span className="country-name">{city.country}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <h3 style={{ marginTop: 20 }}>Manual Coordinates</h3>
        <div className="control-group">
          <label>Latitude</label>
          <input
            type="number"
            step="0.0001"
            placeholder="-16.409"
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
          />
        </div>
        <div className="control-group">
          <label>Longitude</label>
          <input
            type="number"
            step="0.0001"
            placeholder="-71.5375"
            value={lon}
            onChange={(e) => setLon(Number(e.target.value))}
          />
        </div>
        <div className="control-group">
          <label>Altitude</label>
          <input
            type="number"
            min={100}
            max={50000}
            value={alt}
            onChange={(e) => setAlt(Number(e.target.value))}
          />
        </div>
        <div className="control-group">
          <button onClick={flyToLocation}>Go to Location</button>
        </div>
      </div>

      <div className="status-panels">
        <div className="character-panel">
          <h3>Your Avatar</h3>
          <div className="character-status">
            <div
              className="avatar-3d-container"
              draggable
              onDragStart={handleAvatarDragStart}
              onDragEnd={handleAvatarDragEnd}
            >
              {isMounted && (
                <model-viewer
                  ref={avatarModelViewerRef}
                  src={getAvatarModelPath(aqi)}
                  alt="3D Avatar"
                  auto-rotate
                  camera-controls
                  loading="eager"
                  exposure="1"
                  shadow-intensity="1"
                  style={{
                    width: '100%',
                    height: '120px',
                    transition: 'filter 0.5s ease',
                    pointerEvents: 'none'
                  }}
                />
              )}
            </div>
            <div className="character-details">
              <div className="character-mood">{avatarState.mood}</div>
              <div className="drag-hint">Drag to move</div>
            </div>
          </div>
          <div className={`aqi-indicator ${getAQIClass(aqi)}`}>
            AQI: {getAQIText(aqi)} {aqi !== null && aqi !== undefined ? `(${Math.round(aqi)})` : ''}
          </div>
          <div className="aqi-source-indicator">
            Source: {aqiSource === 'real' ? 'Live' : aqiSource === 'mock' ? 'Demo' : 'Unavailable'}
          </div>
          <div className="aqi-status-message">{aqiStatusMessage}</div>
          <div className="location-info">
            <div>Location: <span>{locationName}</span></div>
            <div>Time: <span>{timeInLocation}s</span></div>
          </div>
        </div>

        <div className="lung-panel">
          <h3>Lung Health</h3>
          <div className="lung-model-container">
            {isMounted && (
              <model-viewer
                id="lung-model"
                ref={lungModelRef}
                src={getLungModelPath(lungHealth)}
                alt="3D Lung Model"
                auto-rotate
                camera-controls
                loading="eager"
                exposure="1"
                shadow-intensity="1"
                style={{
                  width: '100%',
                  height: '200px',
                  filter: lungHealth > 70
                    ? 'brightness(1.1)'
                    : lungHealth > 40
                      ? 'saturate(1.2) brightness(0.95)'
                      : 'saturate(1.3) brightness(0.9)'
                }}
              />
            )}
          </div>
          <div className="lung-health-bar">
            <div
              className="lung-health-fill"
              style={{
                width: `${Math.round(lungHealth)}%`,
                background:
                  lungHealth > 70
                    ? "linear-gradient(90deg, #10b981, #059669)"
                    : lungHealth > 40
                      ? "linear-gradient(90deg, #f59e0b, #d97706)"
                      : "linear-gradient(90deg, #ef4444, #dc2626)"
              }}
            ></div>
          </div>
          <div className="lung-health-text">
            Health: <span>{Math.round(lungHealth)}%</span>
          </div>
        </div>
      </div>

      <div className="coords-display">
        Lat: {coordsDisplay.lat} | Long: {coordsDisplay.lon} | Alt: {coordsDisplay.alt}m
      </div>
    </div>
  );
};

export default InteractiveMap;