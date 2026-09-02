

# Run this script to take snapshot of your database
./backup.sh


# RoyalBet

RoyalBet is a Docker-first betting platform with:

- a NestJS backend on port `4000`
- a Next.js frontend on port `3000`
- PostgreSQL for persistence
- Redis for cache and websocket support
- an ngrok sharing flow for client demos

## Current entry points

- User app: `http://127.0.0.1:3000/user`
- Admin login: `http://127.0.0.1:3000/admin/login`
- Backend health: `http://127.0.0.1:4000/health`

The frontend root `/` redirects to `/user`.

## Recommended way to run

### Local Docker stack

```powershell
docker compose --env-file .env.live -f docker-compose.live.yml up -d --build
```

### One-command local + ngrok share flow

```powershell
powershell -ExecutionPolicy Bypass -File .\go-live.ps1
```

That script:

1. starts Docker if needed
2. starts ngrok
3. refreshes `.env.live`
4. rebuilds the live Docker stack
5. waits for backend and frontend readiness
6. ensures the admin account exists