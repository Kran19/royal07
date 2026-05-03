# RoyalBet Backend

This backend is a NestJS service responsible for:

- authentication
- betting APIs
- round lifecycle management
- admin settings
- websocket events
- settlement and payout processing

## Run locally

From [backend](/c:/Users/Admin/Desktop/royalbackend/backend):

```powershell
npm install
npm run build
npm run start:dev
```

The service expects:

- PostgreSQL reachable through `DATABASE_URL`
- Redis reachable through `REDIS_URL`
- JWT secret in `JWT_SECRET`

## Production entry point

The correct production start command is:

```powershell
npm run start:prod
```

This now resolves to `node dist/src/main.js`.

## Health

The backend exposes:

```text
GET /health
```

Docker and the admin UI should use this endpoint to decide whether the service is online.

## Important flow

1. `AppModule` wires Prisma, Redis, auth, bets, game lifecycle, websocket, settings, and stats.
2. `GameLifecycleService` starts a round on module init.
3. Bets are collected during the betting phase.
4. The result is calculated at lock time.
5. Settlement updates bets, round totals, balances, and websocket events.

## Notes

- `AdminSettings` auto-initializes if missing.
- The live Docker image runs `prisma db push` before starting the Nest app.
- For the full stack flow, see [PROJECT_RUNBOOK.md](/c:/Users/Admin/Desktop/royalbackend/PROJECT_RUNBOOK.md).
