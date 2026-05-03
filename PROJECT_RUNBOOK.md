# RoyalBet Runbook

## 1. System overview

RoyalBet has four active runtime pieces:

- `frontend`: Next.js app on port `3000`
- `backend`: NestJS API and websocket server on port `4000`
- `postgres`: primary database
- `redis`: cache and websocket support

The frontend talks to the backend in two ways:

- REST API calls for auth, bets, rounds, wallet, settings, analytics
- WebSocket events for live game state and admin live monitoring

## 2. Real request flow

### User flow

1. Browser opens `/user`
2. Frontend loads data from backend routes such as `/game/current-round`, `/bets/current-round`, `/bets/history`
3. Frontend opens a websocket connection to the backend
4. Live round state is broadcast from the backend game engine
5. Bet placement and balance updates move through backend services and Prisma

### Admin flow

1. Browser opens `/admin/login`
2. Admin page checks backend health at `/health`
3. Admin logs in through `/auth/login`
4. Dashboard and monitoring pages call backend APIs and listen for websocket updates

### Game engine flow

1. `GameLifecycleService` starts a new round
2. Phase moves through `BETTING -> LOCKED -> MOVING -> RESULT -> BUFFER`
3. During `LOCKED`, the backend calculates the opening
4. During `RESULT`, the backend settles bets and updates balances
5. A new round starts again

If there are no bets, the backend now keeps a random quad result instead of accidentally overwriting it with the first calculator result.

## 3. Local development

### Backend only

From [backend](/c:/Users/Admin/Desktop/royalbackend/backend):

```powershell
npm install
npm run build
npm run start:dev
```

### Frontend only

From [frontend](/c:/Users/Admin/Desktop/royalbackend/frontend):

```powershell
npm install
npm run build
npm run dev
```

For local frontend development, `frontend/next.config.ts` now falls back to `http://localhost:4000` for internal rewrites.

## 4. Docker flow

### Main live stack

Run from repo root:

```powershell
docker compose --env-file .env.live -f docker-compose.live.yml up -d --build
```

Verify:

- frontend: `http://127.0.0.1:3000/user`
- admin: `http://127.0.0.1:3000/admin/login`
- backend health: `http://127.0.0.1:4000/health`

### Why this now works

- backend has a real `/health` endpoint
- backend production command now points to `dist/src/main.js`
- frontend healthcheck no longer fails on a redirecting `/`
- frontend rewrites use `INTERNAL_BACKEND_URL` inside Docker

## 5. ngrok share flow

Use:

```powershell
powershell -ExecutionPolicy Bypass -File .\go-live.ps1
```

That script now:

1. checks Docker
2. restarts ngrok cleanly
3. refreshes `.env.live`
4. rebuilds the Docker live stack
5. waits for local frontend and backend readiness
6. seeds the admin account
7. prints local and public URLs

### ngrok caveat

On free ngrok plans, first browser visits may show a warning/interstitial page. That is an ngrok behavior, not an app failure.

## 6. Admin credentials

- Mobile: `9998887766`
- Password: `admin123`

## 7. Root causes that were fixed

### Startup

- Removed a broken dependency injection requirement in `OpeningsService`
- Added missing stats controller wiring for opening-related endpoints
- Corrected the backend production start path

### Health and status

- Added `GET /health`
- Updated admin login page to use a real health check

### API contract mismatches

- fixed frontend use of `/game/current` vs backend `/game/current-round`
- fixed frontend use of `/bet/...` vs backend `/bets/...`
- added missing backend route for round-specific bet lookups

### Runtime environment

- frontend internal rewrites now work both on host-local development and inside Docker
- frontend Docker healthcheck now checks a real usable page

### Gameplay correctness

- no-bet rounds no longer get overwritten by calculator output

## 8. Honest project assessment

Current state after fixes: roughly `6.5/10`.

Why:

- core local and Docker flow is now operational
- share flow is usable
- architecture is modular enough to keep improving
- but there is still technical debt, thin automated testing, and some rough production assumptions

## 9. Recommended next steps

1. Add smoke tests for `/health`, login, current round, and websocket connect.
2. Add one consistent seed path instead of scattered manual admin creation.
3. Remove stale deployment files or clearly separate demo vs production stack.
4. Add structured logging around round transitions, settlement, and websocket connection failures.
5. Add a small architecture doc per module so future changes are safer.
