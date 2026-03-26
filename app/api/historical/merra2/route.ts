import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:5050/api';

export async function GET(request: NextRequest) {
  const forwardUrl = new URL(`${BASE_URL}/historical/merra2`);
  request.nextUrl.searchParams.forEach((value, key) => {
    forwardUrl.searchParams.set(key, value);
  });

  try {
    const response = await fetch(forwardUrl.toString(), { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'El servicio histórico de NASA no está disponible en este momento' },
      { status: 503 }
    );
  }
}
