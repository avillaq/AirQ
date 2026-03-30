import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/server-db';
import { ensureSubscriptionsSchema } from '@/lib/alerts-db';

async function unsubscribeByToken(token: string): Promise<{ ok: boolean; message: string }> {
  const pool = getDbPool();
  await ensureSubscriptionsSchema(pool);

  const updateResult = await pool.query(
    `UPDATE subscriptions
     SET status = 'unsubscribed', updated_at = NOW()
     WHERE unsubscribe_token = $1 AND status = 'active'
     RETURNING email`,
    [token]
  );

  if (updateResult.rowCount && updateResult.rowCount > 0) {
    return { ok: true, message: 'Suscripción cancelada correctamente' };
  }

  const existing = await pool.query(
    `SELECT status FROM subscriptions WHERE unsubscribe_token = $1 LIMIT 1`,
    [token]
  );

  if (!existing.rowCount) {
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
