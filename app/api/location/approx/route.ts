import { NextResponse } from 'next/server';

interface ApproxLocation {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

function normalizeIp(raw: string | null): string | null {
  if (!raw) return null;

  const first = raw.split(',')[0]?.trim();
  if (!first) return null;

  // Handle IPv4-mapped IPv6 addresses like ::ffff:1.2.3.4
  const unwrapped = first.startsWith('::ffff:') ? first.slice(7) : first;

  if (unwrapped === '127.0.0.1' || unwrapped === '::1') {
    return null;
  }

  return unwrapped;
}

async function fetchFromIpapi(ip: string | null): Promise<ApproxLocation | null> {
  const suffix = ip ? `${ip}/json/` : 'json/';
  const response = await fetch(`https://ipapi.co/${suffix}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AirQ/1.0',
    },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    latitude?: number;
    longitude?: number;
    city?: string;
    country_name?: string;
  };

  if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
    return null;
  }

  return {
    lat: Number((payload.latitude as number).toFixed(4)),
    lng: Number((payload.longitude as number).toFixed(4)),
    city: payload.city,
    country: payload.country_name,
  };
}

async function fetchFromIpwhois(ip: string | null): Promise<ApproxLocation | null> {
  const endpoint = ip ? `https://ipwho.is/${ip}` : 'https://ipwho.is/';
  const response = await fetch(endpoint, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AirQ/1.0',
    },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    success?: boolean;
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
  };

  if (!payload.success) return null;
  if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
    return null;
  }

  return {
    lat: Number((payload.latitude as number).toFixed(4)),
    lng: Number((payload.longitude as number).toFixed(4)),
    city: payload.city,
    country: payload.country,
  };
}

export async function GET(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = normalizeIp(forwardedFor) || normalizeIp(realIp);

  const providers = [fetchFromIpapi, fetchFromIpwhois];

  for (const provider of providers) {
    try {
      const result = await provider(clientIp);
      if (!result) continue;

      const name = result.city && result.country
        ? `${result.city}, ${result.country}`
        : `${result.lat.toFixed(3)}, ${result.lng.toFixed(3)}`;

      return NextResponse.json({
        lat: result.lat,
        lng: result.lng,
        name,
      });
    } catch {
      // Try next provider.
    }
  }

  return NextResponse.json({ error: 'approx_location_unavailable' }, { status: 503 });
}
