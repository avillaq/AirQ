import { NextRequest, NextResponse } from 'next/server';
import { createUnsubscribeToken } from '@/lib/alerts-db';
import { fetchCurrentUsAqi, isInCooldown, sendAqiAlertEmail } from '@/lib/alerts-service';
import { prisma } from '@/lib/prisma';

const DEFAULT_COOLDOWN_HOURS = 12;

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
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'active',
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      locationDisplay: true,
      latitude: true,
      longitude: true,
      threshold: true,
      unsubscribeToken: true,
      lastAlertSentAt: true,
    },
  });

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
  const failedDetails: Array<{
    subscriptionId: string;
    email: string;
    error: string;
  }> = [];

  for (const row of subscriptions) {
    const coordKey = toCoordKey(row.latitude, row.longitude);

    if (!aqiByCoord.has(coordKey)) {
      const aqi = await fetchCurrentUsAqi(row.latitude, row.longitude);
      aqiByCoord.set(coordKey, aqi);
    }

    const aqi = aqiByCoord.get(coordKey);

    if (aqi === null || aqi === undefined || aqi <= row.threshold) {
      skippedBelowThreshold += 1;
      continue;
    }

    const lastSent = row.lastAlertSentAt ? new Date(row.lastAlertSentAt) : null;
    if (isInCooldown(lastSent, cooldownHours)) {
      skippedCooldown += 1;
      continue;
    }

    const token = row.unsubscribeToken || createUnsubscribeToken();
    if (!row.unsubscribeToken) {
      await prisma.subscription.update({
        where: {
          id: row.id,
        },
        data: {
          unsubscribeToken: token,
        },
      });
    }

    const baseUrl = getBaseUrl(request);
    const unsubscribeUrl = `${baseUrl}/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`;
    const locationLabel = row.locationDisplay || `${row.latitude.toFixed(3)}, ${row.longitude.toFixed(3)}`;

    try {
      await sendAqiAlertEmail({
        to: row.email,
        fullName: row.fullName,
        aqi,
        threshold: row.threshold,
        locationLabel,
        unsubscribeUrl,
      });

      sent += 1;
      await prisma.subscription.update({
        where: {
          id: row.id,
        },
        data: {
          lastAlertSentAt: now,
        },
      });
    } catch (error) {
      failed += 1;

      const message = error instanceof Error ? error.message : String(error);
      const subscriptionId = String(row.id);
      failedDetails.push({
        subscriptionId,
        email: row.email,
        error: message,
      });
    }
  }

  return NextResponse.json({
    status: 'ok',
    checked: subscriptions.length,
    sent,
    skipped_cooldown: skippedCooldown,
    skipped_below_threshold: skippedBelowThreshold,
    failed,
    failed_details: failedDetails,
  });
}
