import type { DataSourceStatus } from '@/types/air-quality';

export type AqiSource = DataSourceStatus;

export interface City {
  city: string;
  cityAscii: string;
  lat: number;
  lng: number;
  country: string;
}

export interface CoordsDisplay {
  lat: string;
  lon: string;
  alt: number;
}

export interface AirQualityResponse {
  source?: AqiSource;
  values?: {
    us_aqi?: number | null;
  };
}

export interface CesiumEntity {
  model?: {
    uri: string;
  };
  position?: unknown;
}

export interface CesiumViewer {
  camera: {
    flyTo: (options: {
      destination: unknown;
      orientation: {
        heading: number;
        pitch: number;
        roll: number;
      };
      duration?: number;
    }) => void;
    pickEllipsoid: (position: unknown, ellipsoid: unknown) => unknown;
    positionCartographic: {
      height: number;
    };
  };
  scene: {
    globe: {
      ellipsoid: unknown;
      enableLighting: boolean;
    };
    skyAtmosphere: {
      show: boolean;
    };
    primitives: {
      add: (primitive: unknown) => void;
    };
    canvas: HTMLCanvasElement;
  };
  entities: {
    add: (entity: unknown) => CesiumEntity;
    remove: (entity: CesiumEntity) => void;
    removeAll: () => void;
  };
  destroy: () => void;
}

export interface CesiumApi {
  Ion: {
    defaultAccessToken?: string;
  };
  Viewer: new (
    container: Element,
    options: {
      baseLayerPicker: boolean;
      geocoder: boolean;
      timeline: boolean;
      animation: boolean;
      shouldAnimate: boolean;
      terrainProvider: unknown;
    }
  ) => CesiumViewer;
  createWorldTerrainAsync: () => Promise<unknown>;
  Cesium3DTileset: {
    fromIonAssetId: (assetId: number) => Promise<unknown>;
  };
  Cartesian3: {
    fromDegrees: (lon: number, lat: number, alt: number) => unknown;
  };
  Math: {
    toRadians: (degrees: number) => number;
    toDegrees: (radians: number) => number;
  };
  HeadingPitchRoll: new (heading: number, pitch: number, roll: number) => unknown;
  Transforms: {
    headingPitchRollQuaternion: (position: unknown, hpr: unknown) => unknown;
  };
  HeightReference: {
    CLAMP_TO_GROUND: unknown;
  };
  ColorBlendMode: {
    HIGHLIGHT: unknown;
  };
  ScreenSpaceEventHandler: new (canvas: HTMLCanvasElement) => {
    setInputAction: (cb: (event: unknown) => void, eventType: unknown) => void;
    destroy: () => void;
  };
  ScreenSpaceEventType: {
    MOUSE_MOVE: unknown;
    LEFT_CLICK: unknown;
  };
  Cartographic: {
    fromCartesian: (cartesian: unknown) => {
      latitude: number;
      longitude: number;
    };
  };
  Cartesian2: new (x: number, y: number) => unknown;
}
