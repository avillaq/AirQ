import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function unsubscribeByToken(token: string): Promise<{ ok: boolean; message: string }> {
  const updateResult = await prisma.subscription.updateMany({
    where: {
      unsubscribeToken: token,
      status: 'active',
    },
    data: {
      status: 'unsubscribed',
    },
  });

  if (updateResult.count > 0) {
    return { ok: true, message: 'Suscripción cancelada correctamente' };
  }

  const existing = await prisma.subscription.findFirst({
    where: {
      unsubscribeToken: token,
    },
    select: {
      status: true,
    },
  });

  if (!existing) {
    return { ok: false, message: 'Token de desuscripción inválido' };
  }

  return { ok: true, message: 'Esta suscripción ya estaba cancelada' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';

    if (!token) {
      return NextResponse.json({ status: 'error', message: 'El token es obligatorio' }, { status: 400 });
    }

    const result = await unsubscribeByToken(token);

    return NextResponse.json({
      status: result.ok ? 'ok' : 'error',
      message: result.message,
    });
  } catch {
    return NextResponse.json({ status: 'error', message: 'No se pudo procesar la desuscripción' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim() || '';

    if (!token) {
      return new NextResponse('<h1>Token inválido</h1><p>No se encontró token de desuscripción.</p>', {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const result = await unsubscribeByToken(token);

    return new NextResponse(
      `<h1>${result.ok ? 'Desuscripción procesada' : 'No se pudo procesar'}</h1><p>${result.message}</p>`,
      {
        status: result.ok ? 200 : 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch {
    return new NextResponse('<h1>Error</h1><p>No se pudo procesar la desuscripción.</p>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
