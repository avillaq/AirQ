import { NextResponse } from 'next/server';

const geojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'delhi', name: 'New Delhi, India', aqi: 185, pm25: 120 },
      geometry: { type: 'Point', coordinates: [77.2245, 28.6358] },
    },
    {
      type: 'Feature',
      properties: { id: 'beijing', name: 'Beijing, China', aqi: 165, pm25: 95 },
      geometry: { type: 'Point', coordinates: [116.4074, 39.9042] },
    },
    {
      type: 'Feature',
      properties: { id: 'london', name: 'London, UK', aqi: 45, pm25: 15 },
      geometry: { type: 'Point', coordinates: [-0.1278, 51.5074] },
    },
    {
      type: 'Feature',
      properties: { id: 'mexicocity', name: 'Mexico City, Mexico', aqi: 115, pm25: 58 },
      geometry: { type: 'Point', coordinates: [-99.1332, 19.4326] },
    },
    {
      type: 'Feature',
      properties: { id: 'tokyo', name: 'Tokyo, Japan', aqi: 65, pm25: 22 },
      geometry: { type: 'Point', coordinates: [139.6917, 35.6895] },
    },
    {
      type: 'Feature',
      properties: { id: 'lima', name: 'Lima, Peru', aqi: 125, pm25: 65 },
      geometry: { type: 'Point', coordinates: [-77.0428, -12.0464] },
    },
  ],
};

export async function GET() {
  return NextResponse.json(geojson);
}
