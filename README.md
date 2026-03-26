# AirQ Monorepo

Professional monorepo layout with Next.js as the primary app and a dedicated Python NASA historical service.

## Structure

- `apps/web`: Next.js application (UI + main API routes).
- `services/nasa-history-api`: Python Flask microservice for NASA MERRA2 historical endpoint only.

## Local Development

### 1. Web app (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

This command starts:
- Next.js app on `http://localhost:3000`
- NASA history service on `http://localhost:5050`

### 2. Environment variables

- Copy `apps/web/.env.example` to `apps/web/.env.local`
- Copy `services/nasa-history-api/.env.example` to `services/nasa-history-api/.env`

## API Ownership

### Next.js API (`apps/web/app/api`)

- `GET /api/air/latest`
- `GET /api/weather/latest`
- `GET /api/cities/search`
- `GET /api/air/points`
- `POST /api/alerts/subscribe`
- `GET /api/historical/merra2` (proxy to Python service)

### Python NASA service (`services/nasa-history-api`)

- `GET /api/`
- `GET /api/historical/merra2`
