export type UsAqiCategoryKey =
  | 'good'
  | 'moderate'
  | 'unhealthy-sensitive'
  | 'unhealthy'
  | 'very-unhealthy'
  | 'hazardous'
  | 'unavailable';

export type UsAqiCategory = {
  key: UsAqiCategoryKey;
  labelEs: string;
  colorHex: string;
  className: string;
  min: number | null;
  max: number | null;
};

const US_AQI_CATEGORIES: UsAqiCategory[] = [
  { key: 'good', labelEs: 'Bueno', colorHex: '#2ecc71', className: 'aqi-good', min: 0, max: 50 },
  { key: 'moderate', labelEs: 'Moderado', colorHex: '#f1c40f', className: 'aqi-moderate', min: 51, max: 100 },
  {
    key: 'unhealthy-sensitive',
    labelEs: 'Danino para grupos sensibles',
    colorHex: '#e67e22',
    className: 'aqi-sensitive',
    min: 101,
    max: 150,
  },
  { key: 'unhealthy', labelEs: 'Danino', colorHex: '#e74c3c', className: 'aqi-unhealthy', min: 151, max: 200 },
  {
    key: 'very-unhealthy',
    labelEs: 'Muy danino',
    colorHex: '#8e44ad',
    className: 'aqi-very-unhealthy',
    min: 201,
    max: 300,
  },
  { key: 'hazardous', labelEs: 'Peligroso', colorHex: '#6e2c00', className: 'aqi-hazardous', min: 301, max: 500 },
];

export const US_AQI_MAPBOX_COLOR_EXPRESSION = [
  'step',
  ['coalesce', ['get', 'aqi'], 0],
  '#2ecc71',
  51,
  '#f1c40f',
  101,
  '#e67e22',
  151,
  '#e74c3c',
  201,
  '#8e44ad',
  301,
  '#6e2c00',
] as const;

export function getUsAqiCategory(aqi: number | null | undefined): UsAqiCategory {
  if (aqi === null || aqi === undefined || Number.isNaN(aqi)) {
    return {
      key: 'unavailable',
      labelEs: 'No disponible',
      colorHex: '#9ca3af',
      className: 'aqi-unavailable',
      min: null,
      max: null,
    };
  }

  if (aqi <= 50) return US_AQI_CATEGORIES[0];
  if (aqi <= 100) return US_AQI_CATEGORIES[1];
  if (aqi <= 150) return US_AQI_CATEGORIES[2];
  if (aqi <= 200) return US_AQI_CATEGORIES[3];
  if (aqi <= 300) return US_AQI_CATEGORIES[4];
  return US_AQI_CATEGORIES[5];
}

export function getAlertThresholdByAge(age: number): number {
  if (age < 18) return 100;
  if (age < 65) return 150;
  return 100;
}

export function getAlertSensitivityGroup(age: number): string {
  if (age < 18) return 'Menores (alerta desde AQI > 100)';
  if (age < 65) return 'Adultos (alerta desde AQI > 150)';
  return 'Adultos mayores (alerta desde AQI > 100)';
}

export const ALERT_POLICY_LINES = [
  'Menores (0-17): AQI > 100',
  'Adultos (18-64): AQI > 150',
  'Adultos mayores (65+): AQI > 100',
] as const;
