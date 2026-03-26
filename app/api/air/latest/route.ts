import { NextRequest, NextResponse } from 'next/server';
import { ApiValidationError, parseLatLngFromQuery } from '@/lib/server-validation';

const AIR_API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export async function GET(request: NextRequest) {
  try {
    const { lat, lng } = parseLatLngFromQuery(request.nextUrl.searchParams);

    const url = new URL(AIR_API_URL);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('current', 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json(
        { status: 'error', message: 'Air quality provider is currently unavailable' },
        { status: 503 }
      );
    }

    const data = await response.json();
    const current = data?.current ?? {};

    return NextResponse.json({
      status: 'ok',
      location: {
        lat: data?.latitude ?? null,
        lng: data?.longitude ?? null,
      },
      values: {
        pm10: current?.pm10 ?? null,
        pm2_5: current?.pm2_5 ?? null,
        co: current?.carbon_monoxide ?? null,
        no2: current?.nitrogen_dioxide ?? null,
        o3: current?.ozone ?? null,
        us_aqi: current?.us_aqi ?? null,
        timestamp: current?.time ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ApiValidationError) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ status: 'error', message: 'Unexpected server error' }, { status: 500 });
  }
}
