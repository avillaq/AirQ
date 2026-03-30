import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/server-db';
import { createUnsubscribeToken, ensureSubscriptionsSchema } from '@/lib/alerts-db';
import { fetchCurrentUsAqi, isInCooldown, sendAqiAlertEmail } from '@/lib/alerts-service';

const DEFAULT_COOLDOWN_HOURS = 12;

type SubscriptionRow = {
  id: number;
  fullname: string;
  email: string;
  latitude: number;
  longitude: number;
  threshold: number;
  unsubscribe_token: string | null;
  last_alert_sent_at: Date | null;
};

function isAuthorized(request: NextRequest): boolean {
  const requiredSecret = process.env.ALERTS_RUN_SECRET;
  if (!requiredSecret) return false;

  const headerSecret = request.headers.get('x-alerts-secret');
  const authHeader = request.headers.get('authorization');
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  return headerSecret === requiredSecret || bearerSecret === requiredSecret;
}

function toCoordKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

function getBaseUrl(request: NextRequest): string {
  return process.env.APP_BASE_URL || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ status: 'error', message: 'No autorizado' }, { status: 401 });
  }

  const cooldownHours = Number(process.env.ALERTS_COOLDOWN_HOURS || DEFAULT_COOLDOWN_HOURS);
  const pool = getDbPool();

  await ensureSubscriptionsSchema(pool);

  const queryResult = await pool.query<SubscriptionRow>(
    `SELECT id, fullname, email, latitude, longitude, threshold, unsubscribe_token, last_alert_sent_at
     FROM subscriptions
     WHERE status = 'active'`
  );

  const subscriptions = queryResult.rows;
  if (!subscriptions.length) {
    return NextResponse.json({
      status: 'ok',
      checked: 0,
      sent: 0,
      skipped_cooldown: 0,
      skipped_below_threshold: 0,
      failed: 0,
    });
  }

  const aqiByCoord = new Map<string, number | null>();
  const now = new Date();
  let sent = 0;
  let failed = 0;
  let skippedCooldown = 0;
  let skippedBelowThreshold = 0;

  for (const row of subscriptions) {
    const coordKey = toCoordKey(Number(row.latitude), Number(row.longitude));

    if (!aqiByCoord.has(coordKey)) {
      const aqi = await fetchCurrentUsAqi(Number(row.latitude), Number(row.longitude));
      aqiByCoord.set(coordKey, aqi);
    }

    const aqi = aqiByCoord.get(coordKey);

    if (aqi === null || aqi === undefined || aqi <= Number(row.threshold)) {
      skippedBelowThreshold += 1;
      continue;
    }

    const lastSent = row.last_alert_sent_at ? new Date(row.last_alert_sent_at) : null;
    if (isInCooldown(lastSent, cooldownHours)) {
      skippedCooldown += 1;
      continue;
    }

    const token = row.unsubscribe_token || createUnsubscribeToken();
    if (!row.unsubscribe_token) {
      await pool.query(
        `UPDATE subscriptions
         SET unsubscribe_token = $1, updated_at = NOW()
         WHERE id = $2`,
        [token, row.id]
      );
    }

    const baseUrl = getBaseUrl(request);
    const unsubscribeUrl = `${baseUrl}/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`;

    try {
      await sendAqiAlertEmail({
        to: row.email,
        fullName: row.fullname,
        aqi,
        threshold: Number(row.threshold),
        locationLabel: `${Number(row.latitude).toFixed(3)}, ${Number(row.longitude).toFixed(3)}`,
        unsubscribeUrl,
      });

      sent += 1;
      await pool.query(
        `UPDATE subscriptions
         SET last_alert_sent_at = $1, updated_at = NOW()
         WHERE id = $2`,
        [now.toISOString(), row.id]
      );
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({
    status: 'ok',
    checked: subscriptions.length,
    sent,
    skipped_cooldown: skippedCooldown,
    skipped_below_threshold: skippedBelowThreshold,
    failed,
  });
}
