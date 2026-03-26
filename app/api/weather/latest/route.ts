import { NextRequest, NextResponse } from 'next/server';
import { ApiValidationError, toNumber } from '@/lib/server-validation';

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

export async function GET(request: NextRequest) {
  try {
    const latRaw = request.nextUrl.searchParams.get('lat') ?? '-16.409';
    const lngRaw = request.nextUrl.searchParams.get('lng') ?? '-71.5375';

    const lat = toNumber(latRaw, 'lat', -90, 90);
    const lng = toNumber(lngRaw, 'lng', -180, 180);

    const url = new URL(WEATHER_API_URL);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,windspeed_10m');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json(
        { status: 'error', message: 'El proveedor meteorológico no está disponible en este momento' },
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
        temperature: current?.temperature_2m ?? null,
        humidity: current?.relative_humidity_2m ?? null,
        windspeed: current?.windspeed_10m ?? null,
        timestamp: current?.time ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ApiValidationError) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ status: 'error', message: 'Error inesperado del servidor' }, { status: 500 });
  }
}
