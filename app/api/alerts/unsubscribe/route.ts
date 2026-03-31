import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function renderUnsubscribePage(title: string, message: string, variant: 'success' | 'error'): string {
  const accent = variant === 'success' ? '#78fcd6' : '#fca5a5';
  const badgeBackground = variant === 'success' ? 'rgba(120,252,214,0.14)' : 'rgba(252,165,165,0.14)';
  const badgeText = variant === 'success' ? 'Estado: actualizado' : 'Estado: no procesado';

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AirQ | Desuscripcion</title>
      </head>
      <body style="margin:0;background:#0f1211;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#e7eceb;">
        <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
          <section style="width:100%;max-width:640px;background:#141a18;border:1px solid rgba(255,255,255,0.08);border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,0.35);overflow:hidden;">
            <header style="padding:18px 22px;background:#0d0f0e;color:#e7eceb;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(231,236,235,0.7);">AirQ Alerts</p>
              <h1 style="margin:6px 0 0;font-size:22px;line-height:1.2;">Gestion de desuscripcion</h1>
            </header>
            <div style="padding:22px;">
              <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${badgeBackground};color:${accent};font-size:12px;font-weight:700;">${badgeText}</span>
              <h2 style="margin:14px 0 8px;font-size:22px;line-height:1.3;color:${accent};">${title}</h2>
              <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(231,236,235,0.86);">${message}</p>
            </div>
          </section>
        </main>
      </body>
    </html>
  `;
}

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
      return new NextResponse(
        renderUnsubscribePage('Token invalido', 'No se encontro token de desuscripcion.', 'error'),
        {
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    const result = await unsubscribeByToken(token);

    const title = result.ok ? 'Desuscripcion procesada' : 'No se pudo procesar';
    const variant = result.ok ? 'success' : 'error';

    return new NextResponse(renderUnsubscribePage(title, result.message, variant), {
      status: result.ok ? 200 : 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new NextResponse(
      renderUnsubscribePage('Error', 'No se pudo procesar la desuscripcion.', 'error'),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}
