import 'dotenv/config';

const argMap = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.split('=');
  if (key?.startsWith('--')) {
    argMap.set(key.slice(2), value ?? '');
  }
}

const url = argMap.get('url') || process.env.ALERTS_RUN_URL || 'http://localhost:3000/api/alerts/run';
const secret = argMap.get('secret') || process.env.ALERTS_RUN_SECRET;

if (!secret) {
  console.error('Missing secret. Set ALERTS_RUN_SECRET or pass --secret=...');
  process.exit(1);
}

async function main() {
  console.log('POST', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
      'x-alerts-secret': secret,
      'authorization': `Bearer ${secret}`,
      'user-agent': 'GitHub-Actions/airq-alerts-run-simulator',
      'x-github-event': 'schedule',
    },
    body: JSON.stringify({
      source: 'local-simulator',
      timestamp: new Date().toISOString(),
    }),
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  console.log('Status:', response.status, response.statusText);
  console.log('Response:');
  console.log(JSON.stringify(payload, null, 2));

  if (!response.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error('simulate-alerts-run failed:', message);
  process.exit(1);
});
