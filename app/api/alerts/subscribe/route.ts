import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/server-db';
import { getAlertSensitivityGroup, getAlertThresholdByAge } from '@/lib/aqi';
import {
  ApiValidationError,
  parseLatLngFromLocation,
  toEmail,
  toInteger,
  toString,
} from '@/lib/server-validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const firstName = toString(body?.firstName, 'firstName', 2, 40);
    const lastName = toString(body?.lastName, 'lastName', 2, 40);
    const email = toEmail(body?.email);
    const age = toInteger(body?.age, 'age', 1, 120);
    const { lat, lng } = parseLatLngFromLocation(body?.location);
    const threshold = getAlertThresholdByAge(age);

    const pool = getDbPool();
    await pool.query(
      `INSERT INTO subscriptions (fullname, age, email, latitude, longitude, threshold)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`${firstName} ${lastName}`, age, email, lat, lng, threshold]
    );

    return NextResponse.json(
      {
        status: 'ok',
        message: 'Suscripción creada correctamente',
        threshold,
        sensitivity_group: getAlertSensitivityGroup(age),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof ApiValidationError) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: error.statusCode });
    }

    if (error?.code === '23505') {
      return NextResponse.json({ status: 'error', message: 'Este correo ya está suscrito' }, { status: 409 });
    }

    if (
      typeof error?.message === 'string' &&
      (error.message.includes('Missing DATABASE_URL') || error.message.includes('Missing SUBSCRIPTIONS_DATABASE_URL'))
    ) {
      return NextResponse.json(
        { status: 'error', message: 'El servicio de suscripciones no está configurado en el servidor' },
        { status: 503 }
      );
    }

    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code)) {
      return NextResponse.json({ status: 'error', message: 'La base de datos de suscripciones no está disponible en este momento' }, { status: 503 });
    }

    return NextResponse.json({ status: 'error', message: 'No se pudo crear la suscripción' }, { status: 500 });
  }
}
