# Implementation Plan: Crash Recovery & Data Consistency

## 1. Startup Recovery Service (NestJS)
I will create a new `CrashRecoveryService` that runs automatically when the backend server starts (`onModuleInit`).
- It will scan the PostgreSQL database for any `GameRound` with `status = 'ACTIVE'`.
- If it finds one, it means the server crashed mid-round.
- It will automatically fetch all bets associated with that abandoned round.
- It will **refund 100% of the bet amounts** back to the users' Postgres balances.
- It will create `Transaction` records marked as `REFUND` for full auditability.
- It will mark the abandoned round and bets as `CANCELLED`.

## 2. Redis AOF Persistence (Docker)
Currently, your Redis uses standard memory limits. I will update your `docker-compose.live.yml` to enable **Redis AOF (Append Only File)**.
- AOF forces Redis to write every millisecond operation to the physical disk.
- If Redis crashes, it will automatically reconstruct the exact balances and streams from the disk when it reboots.


=========Future CLoud Architecture===========

AWS ElastiCache for Redis: Instead of running Redis in a Docker container, you use Amazon's managed Redis service.
You would configure it as a Multi-AZ cluster.
If the primary Redis node crashes, AWS automatically and instantly fails over to a standby replica node in a different data center. Your players wouldn't even notice the blip.
This completely removes the risk of losing the active round.

1. Launch / Early Scale (Up to ~5,000 concurrent players)
Instance Type: cache.t4g.small
Specs: 1.37 GB RAM, 2 vCPUs
Setup: 2 Nodes (Multi-AZ)
Estimated Cost: ~$25 per month total (~$12.50 per node).
Why it's good: It handles bursts of traffic perfectly and 1.37 GB of RAM is more than enough to hold your active user balances and the 60-second bet streams.

2. Mid-Scale Production (Up to ~30,000 concurrent players)
Instance Type: cache.t4g.medium
Specs: 3.09 GB RAM, 2 vCPUs (higher baseline CPU performance)
Setup: 2 Nodes (Multi-AZ)
Estimated Cost: ~$50 per month total (~$25 per node).
Why it's good: The medium instance gives you a higher baseline CPU limit, ensuring that even if 30,000 users place bets in the last 5 seconds of the round, the Lua script execution doesn't bottleneck the server.