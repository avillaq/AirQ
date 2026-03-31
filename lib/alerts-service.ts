import nodemailer from 'nodemailer';

const AIR_API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

type AlertEmailInput = {
  to: string;
  fullName: string;
  aqi: number;
  threshold: number;
  locationLabel: string;
  unsubscribeUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getMailTransporter() {
  const user = process.env.ALERTS_SMTP_USER;
  const appPassword = process.env.ALERTS_SMTP_APP_PASSWORD;

  if (!user) {
    throw new Error('Missing ALERTS_SMTP_USER');
  }

  if (!appPassword) {
    throw new Error('Missing ALERTS_SMTP_APP_PASSWORD');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: appPassword,
    },
  });
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
  const transporter = getMailTransporter();
  const smtpUser = process.env.ALERTS_SMTP_USER;

  if (!smtpUser) {
    throw new Error('Missing ALERTS_SMTP_USER');
  }

  const fullName = escapeHtml(input.fullName);
  const locationLabel = escapeHtml(input.locationLabel);
  const unsubscribeUrl = escapeHtml(input.unsubscribeUrl);
  const roundedAqi = Math.round(input.aqi);

  await transporter.sendMail({
    from: smtpUser,
    to: input.to,
    subject: `Alerta AQI: ${locationLabel} en ${roundedAqi}`,
    html: `
      <div style="background:#0f1211;padding:24px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#e7eceb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#141a18;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:#0d0f0e;color:#e7eceb;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(231,236,235,0.7);">AirQ Alerts</p>
              <h1 style="margin:6px 0 0;font-size:22px;line-height:1.2;font-weight:700;">Alerta de calidad del aire</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 8px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hola ${fullName},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(231,236,235,0.9);">Detectamos que el AQI actual en <strong style="color:#78fcd6;">${locationLabel}</strong> es <strong style="color:#78fcd6;">${roundedAqi}</strong>, por encima de tu umbral configurado de <strong>${input.threshold}</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(120,252,214,0.35);background:rgba(120,252,214,0.08);border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#e7eceb;">
                    Recomendacion: limita actividades al aire libre y prioriza ambientes ventilados o con filtracion de aire.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 22px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(231,236,235,0.7);">
                Si ya no deseas recibir estas alertas, puedes
                <a href="${unsubscribeUrl}" style="color:#78fcd6;text-decoration:underline;">desuscribirte aqui</a>.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
}
