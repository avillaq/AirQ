import type { CesiumApi } from '@/types/interactive-map';

declare global {
  interface Window {
    Cesium: CesiumApi;
    CESIUM_BASE_URL: string;
  }
}

export {};
