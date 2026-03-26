import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/server-db';
import {
  ApiValidationError,
  parseLatLngFromLocation,
  toEmail,
  toInteger,
  toString,
} from '@/lib/server-validation';

function calculateThreshold(age: number): number {
  if (age < 13) return 50;
  if (age < 19) return 75;
  if (age < 65) return 100;
  return 50;
}

function getSensitivityGroup(age: number): string {
  if (age < 13) return 'Children (High Sensitivity)';
  if (age < 19) return 'Teenagers (Moderate Sensitivity)';
  if (age < 65) return 'Adults (Normal Sensitivity)';
  return 'Seniors (High Sensitivity)';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const firstName = toString(body?.firstName, 'firstName', 2, 40);
    const lastName = toString(body?.lastName, 'lastName', 2, 40);
    const email = toEmail(body?.email);
    const age = toInteger(body?.age, 'age', 1, 120);
    const { lat, lng } = parseLatLngFromLocation(body?.location);
    const threshold = calculateThreshold(age);

    const pool = getDbPool();
    await pool.query(
      `INSERT INTO subscriptions (fullname, age, email, latitude, longitude, threshold)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`${firstName} ${lastName}`, age, email, lat, lng, threshold]
    );

    return NextResponse.json(
      {
        status: 'ok',
        message: 'Subscription created successfully',
        threshold,
        sensitivity_group: getSensitivityGroup(age),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof ApiValidationError) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: error.statusCode });
    }

    if (error?.code === '23505') {
      return NextResponse.json({ status: 'error', message: 'This email is already subscribed' }, { status: 409 });
    }

    if (typeof error?.message === 'string' && error.message.includes('Missing DATABASE_URL')) {
      return NextResponse.json(
        { status: 'error', message: 'Subscriptions service is not configured on the server' },
        { status: 503 }
      );
    }

    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code)) {
      return NextResponse.json({ status: 'error', message: 'Subscriptions database is currently unavailable' }, { status: 503 });
    }

    return NextResponse.json({ status: 'error', message: 'Failed to create subscription' }, { status: 500 });
  }
}
