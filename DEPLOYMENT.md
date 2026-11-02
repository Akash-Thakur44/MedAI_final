# Deployment

## Architecture

- Supabase provides the Postgres database and Storage.
- Render runs the Flask API from `medical-ai-backend`.
- Vercel serves the static frontend from `medical-ai-frontend`.

The application uses the Supabase client API; it does not use `DATABASE_URL`.
Do not add the Postgres password or a service-role key to Vercel.

## Supabase

1. Open the Supabase project's SQL Editor and run [`schema.sql`](./schema.sql).
2. In Project Settings > API, copy the project URL, legacy anon key, and
   legacy service-role key. The backend's pinned Supabase client uses these
   JWT-format keys. The backend uses these environment variable names:
   `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_KEY`.
3. Create the `medical-images` Storage bucket and keep it **private**. The
   backend stores bucket-relative object paths and returns short-lived signed
   URLs only from authenticated API requests.

Keep the service-role/secret key private. Never expose it in frontend code.

## Render backend

Create a Blueprint deployment from the repository using [`render.yaml`](./render.yaml).
It sets the backend root directory, install/start commands, health check, and
generates the Flask and JWT secrets. If you keep the existing Render service,
set its Root Directory to `medical-ai-backend` and use the build/start commands
from `render.yaml` in that service's settings instead. Supply the prompted
values in Render's environment settings:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase legacy anon key |
| `SUPABASE_SERVICE_KEY` | Supabase legacy service-role key |
| `GEMINI_API_KEY` | Gemini API key |
| `FRONTEND_URL` | Production Vercel site URL, including `https://` |

Render provides `PORT`. `ALLOWED_ORIGINS` is optional and is only needed for
additional frontend domains; separate multiple origins with commas.

After deployment, verify `https://<render-service>.onrender.com/api/health`.
The database health check is at `/api/health/db`.

## Vercel frontend

Set the Vercel project's Root Directory to `medical-ai-frontend`. It is a
static HTML/JavaScript site and does not need build-time secrets or environment
variables. The API URL is currently set in `js/config.js`; update it to the
Render service URL before using the deployed frontend.

Do not put Gemini, JWT, Supabase service-role, or database passwords in Vercel
frontend variables or browser-delivered files. The browser only needs the public
site URL; all API credentials belong in Render.

## Local backend environment

Copy `medical-ai-backend/.env.example` to `medical-ai-backend/.env` and replace
the placeholders for local development. Do not commit `.env`.
