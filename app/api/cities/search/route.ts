import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { ApiValidationError, toInteger, toString } from '@/lib/server-validation';

type City = {
  city: string;
  country: string;
  lat: number;
  lng: number;
};

let cachedCities: City[] | null = null;

function loadCities(): City[] {
  if (cachedCities) {
    return cachedCities;
  }

  const csvPath = path.join(process.cwd(), 'public', 'worldcities.csv');
  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split('\n').slice(1);

  cachedCities = lines
    .map((line) => {
      const match = line.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
      if (!match) return null;

      return {
        city: match[1],
        country: match[5],
        lat: Number(match[3]),
        lng: Number(match[4]),
      } as City;
    })
    .filter((city): city is City => Boolean(city));

  return cachedCities;
}

export async function GET(request: NextRequest) {
  try {
    const q = toString(request.nextUrl.searchParams.get('q'), 'q', 2, 80);
    const limit = toInteger(request.nextUrl.searchParams.get('limit') ?? 10, 'limit', 1, 50);

    const query = q.toLowerCase();
    const cities = loadCities();

    const filtered = cities
      .filter((city) => city.city.toLowerCase().includes(query) || city.country.toLowerCase().includes(query))
      .slice(0, limit);

    return NextResponse.json({
      status: 'ok',
      count: filtered.length,
      cities: filtered,
    });
  } catch (error) {
    if (error instanceof ApiValidationError) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ status: 'error', message: 'No se pudieron buscar ciudades' }, { status: 500 });
  }
}
