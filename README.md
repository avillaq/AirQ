# AirQ

Professional monorepo layout with Next.js as the primary app and a dedicated Python NASA historical service.

## Local Development

### 1. Web app (Next.js)

```bash
npm install
npm run dev
```

This command starts:
- Next.js app on `http://localhost:3000`

### 2. Environment variables

- Copy `.env.example` to `.env`

## API Ownership

### Next.js API (`app/api`)

- `GET /api/air/latest`
- `GET /api/weather/latest`
- `GET /api/cities/search`
- `GET /api/air/points`
- `POST /api/alerts/subscribe`
