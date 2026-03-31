import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { createUnsubscribeToken } from '@/lib/alerts-db';
import { getAlertSensitivityGroup, getAlertThresholdByAge } from '@/lib/aqi';
import { prisma } from '@/lib/prisma';
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
    const locationDisplayRaw = typeof body?.locationDisplay === 'string' ? body.locationDisplay.trim() : '';
    const locationDisplay = locationDisplayRaw || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    const threshold = getAlertThresholdByAge(age);
    const unsubscribeToken = createUnsubscribeToken();

    await prisma.subscription.create({
      data: {
        fullName: `${firstName} ${lastName}`,
        age,
        email,
        locationDisplay,
        latitude: lat,
        longitude: lng,
        threshold,
        status: 'active',
        unsubscribeToken,
      },
    });

    return NextResponse.json(
      {
        status: 'ok',
        message: 'Suscripción creada correctamente',
        threshold,
        sensitivity_group: getAlertSensitivityGroup(age),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ApiValidationError) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: error.statusCode });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ status: 'error', message: 'Este correo ya está suscrito' }, { status: 409 });
    }

    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : undefined;
    const errorMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : undefined;

    if (
      typeof errorMessage === 'string' &&
      (errorMessage.includes('Missing DATABASE_URL') || errorMessage.includes('Missing SUBSCRIPTIONS_DATABASE_URL'))
    ) {
      return NextResponse.json(
        { status: 'error', message: 'El servicio de suscripciones no está configurado en el servidor' },
        { status: 503 }
      );
    }

    if (errorCode && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(errorCode)) {
      return NextResponse.json({ status: 'error', message: 'La base de datos de suscripciones no está disponible en este momento' }, { status: 503 });
    }

    return NextResponse.json({ status: 'error', message: 'No se pudo crear la suscripción' }, { status: 500 });
  }
}
