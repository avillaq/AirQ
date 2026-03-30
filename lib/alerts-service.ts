import { Resend } from 'resend';

const AIR_API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

type AlertEmailInput = {
  to: string;
  fullName: string;
  aqi: number;
  threshold: number;
  locationLabel: string;
  unsubscribeUrl: string;
};

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY');
  }
  return new Resend(apiKey);
}

export async function fetchCurrentUsAqi(lat: number, lng: number): Promise<number | null> {
  const url = new URL(AIR_API_URL);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', 'us_aqi');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const value = data?.current?.us_aqi;
  if (value === null || value === undefined) return null;

  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : null;
}

export function isInCooldown(lastAlertSentAt: Date | null, cooldownHours: number): boolean {
  if (!lastAlertSentAt) return false;
  const elapsed = Date.now() - lastAlertSentAt.getTime();
  return elapsed < cooldownHours * 60 * 60 * 1000;
}

export async function sendAqiAlertEmail(input: AlertEmailInput): Promise<void> {
  const resend = getResendClient();
  const fromEmail = process.env.ALERTS_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error('Missing ALERTS_FROM_EMAIL');
  }

  await resend.emails.send({
    from: fromEmail,
    to: input.to,
    subject: `Alerta AQI: ${input.locationLabel} en ${Math.round(input.aqi)}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="margin: 0 0 12px;">Alerta de calidad del aire</h2>
        <p>Hola ${input.fullName},</p>
        <p>El AQI actual en <strong>${input.locationLabel}</strong> es <strong>${Math.round(input.aqi)}</strong>, superando tu umbral de <strong>${input.threshold}</strong>.</p>
        <p>Te recomendamos reducir actividades al aire libre y tomar precauciones.</p>
        <hr style="margin: 16px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #555;">
          Si ya no deseas recibir estas alertas, puedes
          <a href="${input.unsubscribeUrl}">desuscribirte aquí</a>.
        </p>
      </div>
    `,
  });
}
