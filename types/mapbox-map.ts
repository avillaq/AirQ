import type { AirQualityViewData, DataSourceStatus, SelectedLocation } from '@/types/air-quality';

export type LngLatTuple = [number, number];

export interface CitySuggestion {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface SearchCitiesResult {
  cities?: CitySuggestion[];
}

export interface AirQualityPointsResult {
  geojson: GeoJSON.FeatureCollection;
  source: DataSourceStatus;
  message?: string;
}

export interface MapViewProps {
  center?: LngLatTuple;
  zoom?: number;
  refreshMs?: number;
  allowRecenter?: boolean;
  airQualityData?: AirQualityViewData | null;
  locationName?: string;
  dataSourceStatus?: DataSourceStatus;
  dataStatusMessage?: string;
  onLocationSelect?: (location: SelectedLocation) => void;
}

export interface MetricsProps {
  data: AirQualityViewData;
  locationName: string;
  sourceStatus: DataSourceStatus;
  sourceMessage: string;
}
