# Calculator Microservices Project

## What this project does

A calculator API, built as a learning project spanning Node.js/Express, Docker, and Raspberry Pi deployment. It grew from a single service into a small, layered system:

```
Client (Mac / phone / anything on the network)
    │
    ▼
nginx-proxy  ── checks X-API-Key header, rejects with 403 if missing/wrong
    │
    ▼
gateway  ── routes /add, /subtract, /multiply, /divide to the right backend
    │
    ▼
add-service / subtract-service / multiply-service / divide-service
    │
    ▼
logs-db (Postgres)  ── every request logged as a row, survives container restarts
```

Each backend service exposes a `/health` endpoint, checked continuously by Docker Compose healthchecks. The whole stack runs via Docker Compose, both on a Mac (development) and a Raspberry Pi 4 (deployment target).

## Accomplishments so far

### Foundations
- Built a single-service Node/Express calculator API, containerized it, deployed it to a Raspberry Pi 4 (after discovering the originally-planned Pi Zero 2 W was actually an incompatible ARMv6 Pi Zero 1.1)
- Docker on the Pi runs in rootless mode

### Microservices split
- Split into four independent services (add/subtract/multiply/divide), each with its own Dockerfile, orchestrated by one `docker-compose.yml`
- Extracted shared middleware into `shared/` (`loggers.js`, `validation.js`, `responses.js`) using the closure pattern, so each service configures shared functions with its own `serverType`
- Solved a Docker build-context bug where `shared/` wasn't reachable from each service's container, by widening the Compose build context to the repo root and mirroring the local folder structure inside each image
- Per-service config (port, endpoint, serverType, symbol) moved to environment variables
- Added proper error handling: a 404 catch-all and a 500 error handler (using Express's 4-argument `(err, req, res, next)` signature)
- Fixed several "closure called immediately instead of handed to Express" bugs — the recurring lesson across the whole project: a function passed to Express must not be called directly, only its *return value* should be

### Developer experience
- Replaced Compose's `sync+restart` watch action with `nodemon` running inside each container
- Added Compose healthchecks with a `start_period` to avoid startup races
- Set up a Colima ARM64 VM profile to build/test ARM64 images locally on an Intel Mac before deploying to the Pi
- Did a manual Docker networking exercise on the Pi (no Compose) — `docker network create` plus `docker run --network --name` — confirming by hand exactly what Compose automates for container-to-container DNS resolution

### Gateway
- Built a gateway service that receives requests on one port and routes them to the correct backend using container-to-container networking (Compose service names as hostnames)
- Currently a transparent pass-through, relaying the backend's exact status code and body

### Security layer: nginx-proxy
- Added an nginx reverse-proxy container in front of the gateway, whose only job is checking for a required `X-API-Key` header and rejecting anything without it (403)
- The gateway itself is no longer reachable directly — no published port in the base `docker-compose.yml`
- Split the compose config into a locked-down base file (`docker-compose.yml`, no ports on gateway/backends) and a gitignored `docker-compose.override.yml` that adds ports back for convenient local dev — Compose loads the override automatically; `docker compose -f docker-compose.yml up` runs the secure version explicitly
- Explored (but held off on) adding a Pi host firewall (`ufw`) to further restrict which client IPs can reach published ports

### Request origin tracking
- `nginx-proxy` sets `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` from the real incoming request
- The gateway explicitly re-sets these headers on its own outgoing `fetch` call to the backend (since a new `fetch` request doesn't automatically inherit headers from the request that triggered it) and logs them
- Backends log them too, with a `"direct"` fallback for requests that bypass the proxy entirely
- Fixed a subtle bug where forwarding a genuinely-missing header through `fetch`'s headers object caused it to serialize as the literal text `"undefined"` (later `"null"`) downstream, instead of being absent — fixed by only adding a header to the outgoing request when a real value exists

### Persistent logging: Postgres
- Added `logs-db`, a Postgres 16 container with a named Docker volume, so log data survives `docker compose down`/`up` — proven with a manual insert-then-restart test
- Created a `request_logs` table (service, method, path, forwarded-for/host/proto, status code, timestamp)
- Built `shared/db.js` as its own mini-package (own `package.json` and `node_modules`) after learning that installed npm packages — unlike your own relative-import code — need `node_modules` local to wherever the importing file lives; each service's Dockerfile now also installs `shared`'s own dependencies inside the container
- Wired logging into `apiResponseSuccess` with `try/catch` around the database write, so a database failure is logged but never breaks the actual API response
- `"direct"` (not a blank/NULL value) is stored for the forwarded-origin columns when a request bypasses the proxy, so it's easy to query for later

## How to run

### With Docker Compose

```bash
# local dev — ports exposed, override file loads automatically
docker compose up --build --watch

# "secure" mode — matches production, gateway/backends not directly reachable
docker compose -f docker-compose.yml up --build -d
```

Through the full stack (the intended path):
```bash
curl -H "X-API-Key: <your-key>" "http://localhost:8888/add?a=5&b=3"
```

Directly against a backend (only reachable in local-dev/override mode):
```bash
curl "http://localhost:8081/add?a=5&b=3"
```

Stop everything:
```bash
docker compose down
```

### Locally with Node (no Docker)

Each service folder has a gitignored `.env` mirroring its Compose environment variables:
```
PORT=8080
ENDPOINT=/add
SERVER_TYPE=add-service
SYMBOL=+
```
```bash
cd calculator-microservices/add-service
node --watch --env-file=.env add_server.js
```

## Useful commands

**Compose**
```bash
docker compose up --build --watch       # rebuild, start, live-sync file changes
docker compose up --build add-service   # just one service
docker compose down                     # stop and remove everything
docker compose ps                       # status of all services
```

**Logs**
```bash
docker compose logs -f                       # all services, interleaved
docker compose logs -f add-service           # one service
docker compose logs -f | grep -v '/health'   # hide healthcheck noise
```

**Inside a container**
```bash
docker compose exec add-service sh
docker compose exec logs-db psql -U calc_logs -d calc_logs
```

**Healthchecks**
```bash
docker inspect <container> --format='{{json .Config.Healthcheck}}'   # configured check
docker inspect <container> --format='{{json .State.Health}}' | jq    # recent run history
```
Note: healthchecks run continuously (every ~10s) for the life of the container — the steady stream of `/health` log lines is expected, not a bug.

**Postgres queries** (from inside `logs-db`)
```sql
SELECT * FROM request_logs ORDER BY id DESC LIMIT 20;
SELECT * FROM request_logs WHERE forwarded_for = 'direct';
```

**Networking troubleshooting**
```bash
docker network ls
docker network inspect <network-name>   # see which containers are attached
docker network disconnect <network> <container>
```

## JavaScript & Node concepts learned along the way

- **Functions are values** — a function reference without `()` never runs; adding `()` runs it immediately. Root cause of nearly every middleware bug hit this project.
- **Closures** (a function returning a function) — used throughout `shared/` so middleware can be pre-configured (e.g. with `serverType`) before Express calls the returned inner function later, once per request.
- **Middleware** — any function Express calls automatically as part of handling a request, recognizable by its `(req, res, next)` (or 4-argument error-handler) shape and by being handed to `app.use()`/`app.get()` rather than called directly.
- **ES Modules** (`import`/`export`) vs CommonJS (`require`/`module.exports`) — two module systems that can't mix in one file; `package.json`'s `"type"` field sets the default.
- **`async`/`await` and `fetch`** — a Promise represents a value that isn't ready yet; `await` pauses just the current function without freezing the whole program. This is what lets the gateway make a request to a backend and wait for the response, and what makes a Postgres query (`pool.query`) awaitable the same way a `fetch` call is.
- **Docker build-context isolation** — each service only sees files inside its own build context by default; sharing code means widening the context and mirroring the local folder structure.
- **Container-to-container networking** — Compose gives every service a DNS-resolvable hostname matching its service name.
- **npm packages need their own `node_modules` per location** — unlike your own relative-import code, an installed package like `pg` is resolved relative to the importing file's own `node_modules`, not just wherever the file happens to live; a shared folder using an installed package needs its own `package.json`/`node_modules`, or the dependency needs installing in every consumer.
- **Reverse proxies vs plain port forwarding** — a port map is a dumb pipe with a fixed destination; a proxy terminates the connection and makes a decision (which header to check, which backend to call) before forwarding on.

## Next steps / backlog

1. Roll out database logging to the other three backend services and to the 404/500 handlers (currently only wired into successful responses on `add-service`)
2. Give the gateway its own error handling instead of pure pass-through
3. A clearer error response body when `nginx-proxy` rejects a request with 403
4. Redesign to a single endpoint (e.g. `/sum?2+6`) where the gateway parses the expression itself
5. Move `nginx-proxy` into its own separate repo, then figure out building/running both repos together
6. A local reverse-proxy/port-forward (e.g. SSH tunnel) from the Mac to the Pi, instead of typing `pi-docker.local` each time
7. `X-Forwarded-For`-based rate limiting or a simple caching layer at the gateway, as further proxy-concept exercises
8. Revisit the Pi host firewall (`ufw`) idea for IP-based access restriction