# AirQ

Plataforma web para monitoreo de calidad del aire en tiempo real, visualización geoespacial y alertas por correo basadas en umbrales de AQI.

<p align="center">
	<img width="1200" height="557" alt="Vista principal de AirQ" src="https://github.com/user-attachments/assets/9b658fb0-8c38-49a9-9c12-0f4854a158b2" />
</p>

## Tabla de Contenidos

- [Resumen](#resumen)
- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Inicio Rápido](#inicio-rápido)
- [Variables de Entorno](#variables-de-entorno)
- [Scripts Disponibles](#scripts-disponibles)
- [Documentación de API](#documentación-de-api)
- [Flujo de Alertas](#flujo-de-alertas)
- [Base de Datos y Prisma](#base-de-datos-y-prisma)
- [Monitoreo y Resolución de Problemas](#monitoreo-y-resolución-de-problemas)
- [Despliegue](#despliegue)

## Resumen

AirQ centraliza información ambiental para una ubicación seleccionada y ofrece:

- Consulta de calidad del aire (AQI y contaminantes).
- Consulta meteorológica complementaria.
- Visualización en mapa 2D (Mapbox) y experiencia 3D interactiva (Cesium + modelos GLB).
- Suscripciones con alertas automáticas por correo cuando el AQI supera umbrales definidos por edad.

Su utilidad principal es apoyar decisiones cotidianas sobre exposición al aire libre y prevención en momentos de mala calidad ambiental.
Está dirigido a personas y familias, así como a equipos técnicos, educativos o municipales que necesitan monitoreo ambiental práctico y accionable.

## Arquitectura

Arquitectura basada en Next.js App Router:

- Frontend y backend HTTP en el mismo proyecto.
- API routes en `app/api`.
- Cliente de datos en `api/index.js` con reintentos exponenciales para tolerancia a fallos.
- Persistencia de suscripciones en PostgreSQL mediante Prisma.
- Servicio de correo SMTP (Gmail) para notificaciones.

Flujo principal:

1. Usuario selecciona ubicación.
2. Frontend consume endpoints `/api/air/latest` y `/api/weather/latest`.
3. Usuario se suscribe a alertas con su perfil y ubicación.
4. Un proceso programado ejecuta `/api/alerts/run` con autenticación por secreto.
5. Si AQI supera umbral, se envía correo y se aplica cooldown para evitar duplicados frecuentes.

## Stack Tecnológico

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Prisma 7 + PostgreSQL
- Mapbox GL
- CesiumJS
- Nodemailer

Proveedores externos consultados por la API:

- Open-Meteo (calidad del aire y meteorología)
- ipapi / ipwho.is (ubicación aproximada por IP)

## Estructura del Proyecto

```text
app/
	api/
		air/latest
		air/points
		weather/latest
		cities/search
		location/approx
		alerts/subscribe
		alerts/unsubscribe
		alerts/run
	interactive-map/
components/
	mapbox-map/
	interactive-map/
lib/
	aqi.ts
	prisma.ts
	alerts-service.ts
	alerts-db.ts
	server-validation.ts
prisma/
	schema.prisma
scripts/
	simulate-alerts-run.mjs
```

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 14+ (o servicio compatible)

## Inicio Rápido

### 1) Instalar dependencias

```bash
npm install
```

### 2) Configurar variables de entorno

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3) Aplicar migraciones de base de datos

```bash
npx prisma migrate dev
```

### 4) Iniciar entorno de desarrollo

```bash
npm run dev
```

Aplicación disponible en:

- http://localhost:3000

## Variables de Entorno

Configuración base en `.env.example`.

| Variable | Requerida | Ejemplo | Descripción |
|---|---|---|---|
| `APP_BASE_URL` | Recomendado | `http://localhost:3000` | URL pública base para construir links (por ejemplo, desuscripción). |
| `DATABASE_URL` | Sí | `postgresql://user:password@localhost:5432/airq` | Conexión a PostgreSQL para suscripciones. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Sí (mapa 2D) | `pk...` | Token público de Mapbox para visualización 2D. |
| `NEXT_PUBLIC_CESIUM_TOKEN` | Sí (mapa 3D) | `...` | Token de Cesium Ion para escena interactiva 3D. |
| `ALERTS_SMTP_USER` | Sí (alertas) | `mi_correo@gmail.com` | Cuenta remitente para envío de alertas. |
| `ALERTS_SMTP_APP_PASSWORD` | Sí (alertas) | `xxxx xxxx xxxx xxxx` | App Password del proveedor SMTP (Gmail recomendado). |
| `ALERTS_RUN_SECRET` | Sí (alertas automáticas) | `my-secret` | Secreto para autorizar `POST /api/alerts/run`. |
| `ALERTS_RUN_URL` | Sí | `http://mi-dominio.com/api/alerts/run` | URL objetivo para la ejecución de alertas usando GitHub Actions. |
| `ALERTS_COOLDOWN_HOURS` | Opcional | `12` | Cooldown por suscripción para evitar envíos repetidos en ventana corta. |

## Scripts Disponibles

| Script | Comando | Descripción |
|---|---|---|
| Desarrollo | `npm run dev` | Levanta Next.js en modo desarrollo con Turbopack. |
| Build | `npm run build` | Compila aplicación para producción. |
| Inicio producción | `npm run start` | Ejecuta build de Next.js en modo producción. |
| Inicio producción con migraciones | `npm run start:prod` | Despliega migraciones y arranca servidor standalone. |
| Lint | `npm run lint` | Ejecuta análisis estático con reglas de Next.js/ESLint. |
| Simular ejecución de alertas | `npm run alerts:run:simulate` | Lanza un POST autenticado hacia `/api/alerts/run`. |

## Documentación de API

Base local: `http://localhost:3000/api`

### Salud ambiental

#### GET `/air/latest`

Obtiene métricas de calidad del aire para coordenadas específicas.

Query params:

- `lat` (number, requerido, rango -90 a 90)
- `lng` (number, requerido, rango -180 a 180)

Ejemplo:

```bash
curl "http://localhost:3000/api/air/latest?lat=-12.0464&lng=-77.0428"
```

#### GET `/weather/latest`

Obtiene clima actual para coordenadas (si faltan coords, usa valores por defecto).

Query params:

- `lat` (number, opcional)
- `lng` (number, opcional)

Ejemplo:

```bash
curl "http://localhost:3000/api/weather/latest?lat=-12.0464&lng=-77.0428"
```

#### GET `/air/points`

Retorna un GeoJSON de puntos demo para visualización rápida de AQI.

Ejemplo:

```bash
curl "http://localhost:3000/api/air/points"
```

### Localización

#### GET `/cities/search`

Busca ciudades en dataset local `worldcities.csv`.

Query params:

- `q` (string, requerido, 2 a 80 caracteres)
- `limit` (integer, opcional, 1 a 50, default 10)

Ejemplo:

```bash
curl "http://localhost:3000/api/cities/search?q=lima&limit=5"
```

#### GET `/location/approx`

Estimación aproximada de ubicación por IP (fallback entre proveedores externos).

Ejemplo:

```bash
curl "http://localhost:3000/api/location/approx"
```

### Alertas

#### POST `/alerts/subscribe`

Crea una suscripción con umbral definido por edad.

Body JSON:

```json
{
	"firstName": "Ana",
	"lastName": "Pérez",
	"email": "ana@example.com",
	"age": 34,
	"location": "-12.0464,-77.0428",
	"locationDisplay": "Lima, Peru"
}
```

Regla de umbrales:

- 0-17 años: alerta desde AQI > 100
- 18-64 años: alerta desde AQI > 150
- 65+ años: alerta desde AQI > 100

Ejemplo:

```bash
curl -X POST "http://localhost:3000/api/alerts/subscribe" \
	-H "Content-Type: application/json" \
	-d "{\"firstName\":\"Ana\",\"lastName\":\"Perez\",\"email\":\"ana@example.com\",\"age\":34,\"location\":\"-12.0464,-77.0428\",\"locationDisplay\":\"Lima, Peru\"}"
```

#### POST `/alerts/unsubscribe`

Cancela suscripción por token.

Body JSON:

```json
{
	"token": "uuid-token"
}
```

#### GET `/alerts/unsubscribe?token=...`

Endpoint HTML para desuscripción directa desde enlace de correo.

#### POST `/alerts/run`

Ejecuta evaluación masiva de suscripciones activas y envía correos cuando se supera el umbral.

Autenticación:

- Header `x-alerts-secret: <ALERTS_RUN_SECRET>`
- o `Authorization: Bearer <ALERTS_RUN_SECRET>`

Ejemplo:

```bash
curl -X POST "http://localhost:3000/api/alerts/run" \
	-H "x-alerts-secret: my-secret"
```

## Flujo de Alertas

1. Se leen suscripciones activas de base de datos.
2. Se agrupan por coordenadas para minimizar consultas externas de AQI.
3. Se compara AQI actual contra umbral de cada suscriptor.
4. Se respeta cooldown configurable antes de reenviar correo.
5. Se envía email con enlace seguro de desuscripción.
6. Se registra `lastAlertSentAt` para trazabilidad operativa.

## Base de Datos y Prisma

Modelo principal:

- `Subscription` (correo, nombre, edad, coordenadas, umbral, estado, token de baja, timestamps).

Acciones recomendadas:

```bash
npx prisma migrate dev
npx prisma generate
```

Para producción:

```bash
npx prisma migrate deploy
```

## Monitoreo y Resolución de Problemas

### Error de conexión a base de datos

- Verifica `DATABASE_URL`.
- Asegura conectividad de red al host PostgreSQL.

### No se envían alertas por correo

- Verifica `ALERTS_SMTP_USER` y `ALERTS_SMTP_APP_PASSWORD`.
- Revisa que `ALERTS_RUN_SECRET` coincida con headers de ejecución.
- Ejecuta simulador local:

```bash
npm run alerts:run:simulate
```

### Mapas no cargan

- Verifica `NEXT_PUBLIC_MAPBOX_TOKEN` para mapa 2D.
- Verifica `NEXT_PUBLIC_CESIUM_TOKEN` para mapa 3D.

## Despliegue

Recomendaciones:

- Configurar variables de entorno en el proveedor de hosting.
- Ejecutar migraciones antes de arrancar en producción.
- Proteger endpoint `/api/alerts/run` con secreto complejo.
- Programar llamada a `/api/alerts/run` con un scheduler externo (por ejemplo, GitHub Actions cron).

Comando sugerido de arranque productivo:

```bash
npm run start:prod
```
