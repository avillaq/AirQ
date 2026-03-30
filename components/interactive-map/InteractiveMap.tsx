'use client';

import { useEffect, useRef, useState } from "react";
import { getAirQualityData } from '../../api';
import Link from 'next/link';
import { getUsAqiCategory } from '@/lib/aqi';
import type {
  AirQualityResponse,
  AqiSource,
  CesiumEntity,
  CesiumViewer,
  City,
  CoordsDisplay,
} from '@/types/interactive-map';
import "./InteractiveMap.css";

const NEXT_PUBLIC_CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN;
const DEFAULT_LAT = -12.0464;
const DEFAULT_LON = -77.0428;
const DEFAULT_ALT = 14000;
const DEFAULT_LOCATION_NAME = "Lima, Peru";
const MIN_REQUEST_DISTANCE_METERS = 150;

const AVATAR_MODEL_PATH = "/models/avatar/avatar.glb";

type ModelViewerElement = HTMLElement & {
  play: (options?: { repetitions?: number; pingpong?: boolean }) => void;
};

function getAvatarAnimationConfig(aqi: number | null) {
  if (aqi === null || aqi === undefined) return { animationName: "Idle", autoPlay: true };
  if (aqi <= 100) return { animationName: "Wave", autoPlay: true };
  if (aqi <= 200) return { animationName: "estornudar", autoPlay: true };
  return { animationName: "Death", autoPlay: true };
}

function getAvatarModelPath(aqi: number | null) {
  void aqi;
  return AVATAR_MODEL_PATH;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const x = toRad(lon2 - lon1) * Math.cos(toRad((lat1 + lat2) / 2));
  const y = toRad(lat2 - lat1);
  return Math.sqrt(x * x + y * y) * 6371000;
}

function getLungModelPath(lungHealth: number) {
  if (lungHealth > 75) return "/models/lung/lung_healthy.glb";
  if (lungHealth > 50) return "/models/lung/lung_moderate.glb";
  if (lungHealth > 25) return "/models/lung/lung_unhealthy.glb";
  return "/models/lung/lung_dead.glb";
}

function getAQIClass(aqi: number | null) {
  return getUsAqiCategory(aqi).className;
}

function getAQIText(aqi: number | null) {
  return getUsAqiCategory(aqi).labelEs;
}

function getAvatarState(aqi: number | null) {
  const category = getUsAqiCategory(aqi).key;

  if (category === 'unavailable') return "Sin datos";
  if (category === 'good') return "Saludable";
  if (category === 'moderate') return "Molestia leve";
  if (category === 'unhealthy-sensitive') return "Sensible";
  if (category === 'unhealthy') return "Afectado";
  if (category === 'very-unhealthy') return "Muy afectado";
  return "Critico";
}

const InteractiveMap = () => {
  const cesiumContainer = useRef<HTMLDivElement | null>(null);
  const particlesContainer = useRef<HTMLDivElement | null>(null);
  const avatarModelRef = useRef<ModelViewerElement | null>(null);
  const interactionCleanupRef = useRef<(() => void) | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [alt, setAlt] = useState(DEFAULT_ALT);
  const [aqi, setAqi] = useState<number | null>(null);
  const [aqiSource, setAqiSource] = useState<AqiSource>('unavailable');
  const [aqiStatusMessage, setAqiStatusMessage] = useState('Cargando AQI en vivo...');
  const [locationName, setLocationName] = useState(DEFAULT_LOCATION_NAME);
  const [lungHealth, setLungHealth] = useState(100);
  const [timeInLocation, setTimeInLocation] = useState(0);
  const [coordsDisplay, setCoordsDisplay] = useState<CoordsDisplay>({
    lat: DEFAULT_LAT.toFixed(4),
    lon: DEFAULT_LON.toFixed(4),
    alt: DEFAULT_ALT
  });
  const [isDragging, setIsDragging] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const viewerRef = useRef<CesiumViewer | null>(null);
  const characterEntityRef = useRef<CesiumEntity | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetch('/worldcities.csv')
      .then(response => response.text())
      .then(data => {
        const lines = data.split('\n').slice(1);
        const parsedCities = lines.map((line): City | null => {
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
        }).filter((city): city is City => city !== null);
        setCities(parsedCities);
      })
      .catch(error => console.error('Error al cargar ciudades:', error));
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

  const handleCitySelect = (city: City) => {
    setLat(city.lat);
    setLon(city.lng);
    setAlt(DEFAULT_ALT);
    setSearchQuery(`${city.city}, ${city.country}`);
    setShowSuggestions(false);
    setLocationName(`${city.city}, ${city.country}`);

    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, DEFAULT_ALT),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 3
    });
    moveCharacterTo(city.lng, city.lat, `${city.city}, ${city.country}`);
  };

  useEffect(() => {
    const CesiumScript = document.createElement("script");
    CesiumScript.src =
      "https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Cesium.js";
    CesiumScript.async = true;
    CesiumScript.onload = () => {
      window.CESIUM_BASE_URL =
        "https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/";
      window.Cesium.Ion.defaultAccessToken = NEXT_PUBLIC_CESIUM_TOKEN;
      initCesium();
    };
    document.body.appendChild(CesiumScript);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
      if (interactionCleanupRef.current) {
        interactionCleanupRef.current();
      }
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimeInLocation((t) => {
        const next = t + 1;
        if (next % 3 === 0) {
          updateLungHealth();
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aqi]);

  const resetLocationTimer = () => {
    setTimeInLocation(0);
    setLungHealth((h) => Math.min(100, h + 2));
  };

  const updateLungHealth = () => {
    if (aqi === null || aqi === undefined) return;
    const degradationRate = aqi > 100 ? 0.8 : 0.1;
    setLungHealth((h) => Math.max(0, h - degradationRate));
  };

  const initCesium = async () => {
    const Cesium = window.Cesium;
    if (!cesiumContainer.current) return;

    const viewer = new Cesium.Viewer(cesiumContainer.current, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      timeline: false,
      animation: false,
      shouldAnimate: true,
      selectionIndicator: false,
      infoBox: false,
      terrainProvider: await Cesium.createWorldTerrainAsync()
    });
    viewerRef.current = viewer;

    try {
      const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
      viewer.scene.primitives.add(tileset);
    } catch (e) {
      console.error("Error al cargar el tileset:", e);
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
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = DEFAULT_ALT;

    const mouseCleanup = setupMouseEvents();
    const dragDropCleanup = setupAvatarDragDrop();
    interactionCleanupRef.current = () => {
      mouseCleanup();
      dragDropCleanup();
    };
    updateAQIData(lon, lat);
  };

  const createCharacterEntity = (lon: number, lat: number) => {
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

    const viewer = viewerRef.current;

    if (characterEntityRef.current && viewer && characterEntityRef.current.model) {
      const modelPath = getAvatarModelPath(aqi);

      characterEntityRef.current.model.uri = modelPath;
    }
  }, [aqi, isMounted]);


  const setupMouseEvents = () => {
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    if (!viewer) return () => {};

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(function (movementEvent) {
      const movement = movementEvent as { endPosition: unknown };
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

    handler.setInputAction(function (clickEvent) {
      const click = clickEvent as { position: unknown };
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

    return () => {
      handler.destroy();
    };
  };

  const setupAvatarDragDrop = () => {
    const cesiumContainerDiv = cesiumContainer.current;
    if (!cesiumContainerDiv) return () => {};

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    };

    const handleDrop = (e: DragEvent) => {
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
    };

    cesiumContainerDiv.addEventListener('dragover', handleDragOver);
    cesiumContainerDiv.addEventListener('drop', handleDrop);

    return () => {
      cesiumContainerDiv.removeEventListener('dragover', handleDragOver);
      cesiumContainerDiv.removeEventListener('drop', handleDrop);
    };
  };

  const moveCharacterTo = (newLon: number, newLat: number, displayName?: string) => {
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    if (!viewer) return;

    const distanceMeters = getDistanceMeters(lat, lon, newLat, newLon);
    if (distanceMeters < MIN_REQUEST_DISTANCE_METERS) {
      return;
    }

    if (!characterEntityRef.current) {
      createCharacterEntity(newLon, newLat);
    }
    if (!characterEntityRef.current) return;

    characterEntityRef.current.position = Cesium.Cartesian3.fromDegrees(
      newLon,
      newLat,
      10
    );

    setLat(newLat);
    setLon(newLon);
    updateAQIData(newLon, newLat, displayName);
    resetLocationTimer();
    createParticleAnimation();
  };

  const updateAQIData = async (lon: number, lat: number, displayName?: string) => {
    const fallbackName = displayName || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

    try {
      const selectedLocation = { lat, lng: lon };
      const airQuality = (await getAirQualityData(selectedLocation)) as AirQualityResponse;
      const aqiValue = airQuality?.values?.us_aqi;

      if (aqiValue === null || aqiValue === undefined) {
        setAqi(null);
        setAqiSource('unavailable');
        setAqiStatusMessage('AQI no disponible para esta ubicación');
      } else {
        setAqi(aqiValue);
        setAqiSource(airQuality.source || 'real');
        setAqiStatusMessage('AQI en vivo');
      }

      setLocationName(fallbackName);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error de red al consultar el AQI';
      setAqi(null);
      setAqiSource('unavailable');
      setAqiStatusMessage(message);
      setLocationName(fallbackName);
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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewerRef.current) {
          viewerRef.current.entities.removeAll();
          createCharacterEntity(DEFAULT_LON, DEFAULT_LAT);
        }
        setLat(DEFAULT_LAT);
        setLon(DEFAULT_LON);
        setAlt(DEFAULT_ALT);
        setLungHealth(100);
        setAqi(null);
        setAqiSource('unavailable');
        setAqiStatusMessage('Cargando AQI en vivo...');
        setLocationName(DEFAULT_LOCATION_NAME);
        setCoordsDisplay({
          lat: DEFAULT_LAT.toFixed(4),
          lon: DEFAULT_LON.toFixed(4),
          alt: DEFAULT_ALT
        });
        setTimeInLocation(0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAvatarDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
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
        <p style={{ color: 'hsl(var(--foreground))' }}>Cargando mapa...</p>
      </div>
    );
  }

  const avatarMood = getAvatarState(aqi);
  const avatarAnimation = getAvatarAnimationConfig(aqi);
  const numericAqi = aqi ?? 0;
  const avatarFilter =
    numericAqi > 150
      ? 'saturate(1.2) brightness(0.9)'
      : numericAqi > 100
        ? 'saturate(1.1) brightness(0.95)'
        : numericAqi > 50
          ? 'saturate(1.05)'
          : 'brightness(1)';
  const lungFilter =
    lungHealth > 70
      ? 'brightness(1.1)'
      : lungHealth > 40
        ? 'saturate(1.2) brightness(0.95)'
        : 'saturate(1.3) brightness(0.9)';

  return (
    <div className="interactive-map-container">
      <div ref={cesiumContainer} id="cesiumContainer" />
      <div ref={particlesContainer} className="particles-container" />

      <Link href="/" className="home-link">
        <span className="home-text">Inicio</span>
      </Link>

      <div className="status-panels">
        <div className="controls">
          <h3>Buscar ciudad</h3>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar ciudad o país..."
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
        </div>

        <div className="character-panel">
          <h3>Tu avatar</h3>
          <div className="character-status">
            <div
              className="avatar-3d-container"
              draggable
              onDragStart={handleAvatarDragStart}
              onDragEnd={handleAvatarDragEnd}
            >
              {isMounted && (
                <model-viewer
                  ref={avatarModelRef}
                  src={getAvatarModelPath(aqi)}
                  alt="3D Avatar"
                  animation-name={avatarAnimation.animationName}
                  autoplay={avatarAnimation.autoPlay}
                  auto-rotate
                  camera-controls
                  loading="lazy"
                  exposure="1"
                  shadow-intensity="1"
                  style={{
                    width: '100%',
                    height: '92px',
                    transition: 'filter 0.5s ease',
                    pointerEvents: 'none',
                    filter: avatarFilter
                  }}
                />
              )}
            </div>
            <div className="character-details">
              <div className="character-mood">{avatarMood}</div>
              <div className="drag-hint">Arrastra para mover</div>
            </div>
          </div>
          <div className={`aqi-indicator ${getAQIClass(aqi)}`}>
            AQI: {getAQIText(aqi)} {aqi !== null && aqi !== undefined ? `(${Math.round(aqi)})` : ''}
          </div>
          <div className="aqi-source-indicator">
            Fuente: {aqiSource === 'real' ? 'En vivo' : aqiSource === 'mock' ? 'Demostración' : 'No disponible'}
          </div>
          <div className="aqi-status-message">{aqiStatusMessage}</div>
          <div className="location-info">
            <div>Ubicación: <span>{locationName}</span></div>
            <div>Tiempo: <span>{timeInLocation}s</span></div>
          </div>
        </div>

        <div className="lung-panel">
          <h3>Salud pulmonar</h3>
          <div className="lung-model-container">
            {isMounted && (
              <model-viewer
                id="lung-model"
                src={getLungModelPath(lungHealth)}
                alt="3D Lung Model"
                auto-rotate
                camera-controls
                loading="lazy"
                exposure="1"
                shadow-intensity="1"
                style={{
                  width: '100%',
                  height: '132px',
                  filter: lungFilter
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
            Salud: <span>{Math.round(lungHealth)}%</span>
          </div>
        </div>
      </div>

      <div className="coords-display">
        Lat: {coordsDisplay.lat} | Lon: {coordsDisplay.lon} | Alt: {coordsDisplay.alt}m
      </div>
    </div>
  );
};

export default InteractiveMap;