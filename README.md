# Calculator Microservices Project

## What this project does

A calculator API, built as a learning project spanning Node.js/Express, Docker, multi-repo project structure, and Raspberry Pi deployment. It grew from a single service into a small, layered system spread across two repositories:

```
calc-nginx-proxy repo (published as pilchfish/calc-nginx-proxy)
    │
    ▼  (referenced by image, not built inline)
Client (Mac / phone / anything on the network)
    │
    ▼
nginx-proxy  ── checks X-API-Key header, rejects with 403 if missing/wrong
    │           forwards to whatever PROXY_TARGET is set to
    ▼
gateway  ── routes /add, /subtract, /multiply, /divide to the right backend
    │
    ▼
add-service / subtract-service / multiply-service / divide-service
    │
    ▼
logs-db (Postgres)  ── every request logged as a row, schema auto-created, survives container restarts
```

Each backend service exposes a `/health` endpoint, checked continuously by Docker Compose healthchecks. The whole stack runs via Docker Compose, both on a Mac (development) and a Raspberry Pi 4 (deployment target).

## Accomplishments so far

### Foundations
- Built a single-service Node/Express calculator API, containerized it, deployed it to a Raspberry Pi 4 (after discovering the originally-planned Pi Zero 2 W was actually an incompatible ARMv6 Pi Zero 1.1)
- Docker on the Pi runs in rootless mode

### Microservices split
- Split into four independent services (add/subtract/multiply/divide), each with its own Dockerfile, orchestrated by one `docker-compose.yml`
- Extracted shared middleware into `shared/` (`loggers.js`, `validation.js`, `responses.js`) using the closure pattern
- Solved a Docker build-context bug where `shared/` wasn't reachable from each service's container
- Per-service config moved to environment variables; proper 404/500 error handling added

### Developer experience
- `nodemon` inside each container for auto-restart, with Compose `watch` (`sync`) copying changed files in
- Compose healthchecks with `start_period` to avoid startup races
- A Colima ARM64 VM profile to build/test ARM64 images locally on an Intel Mac
- A manual Docker networking exercise on the Pi (no Compose) to understand exactly what Compose automates

### Gateway
- Routes requests to the correct backend using container-to-container networking; currently a transparent pass-through

### Security layer: nginx-proxy
- An nginx reverse-proxy in front of the gateway, checking a required `X-API-Key` header before forwarding
- The gateway itself has no published port — only reachable through the proxy
- A locked-down base `docker-compose.yml` plus a gitignored `docker-compose.override.yml` that adds ports back for local dev

### Request origin tracking
- `X-Forwarded-For`/`Host`/`Proto` set by the proxy, re-set by the gateway on its own outgoing `fetch` call, and logged by the backends (with a `"direct"` fallback when the proxy is bypassed)
- Fixed a bug where forwarding a genuinely-missing header caused it to serialize as the literal text `"undefined"`/`"null"` downstream instead of being absent

### Persistent logging: Postgres
- `logs-db`, a Postgres 16 container with a named Docker volume, so log data survives `docker compose down`/`up`
- A `request_logs` table (service, method, path, forwarded-for/host/proto, status code, timestamp)
- `shared/db.js` built as its own mini-package (own `package.json`/`node_modules`), after learning installed npm packages need `node_modules` local to wherever the importing file lives — unlike your own relative-import code
- Logging wired into `apiResponseSuccess` with `try/catch`, so a database failure is logged but never breaks the actual API response
- **New**: schema creation automated via a mounted `init.sql` in Postgres's `/docker-entrypoint-initdb.d/`, which only runs against a genuinely fresh, empty data volume — no more manual `psql` setup for a new deployment. Along the way, hit a Docker bind-mount gotcha where a missing source file gets silently mounted as an empty directory instead of erroring, and confirmed the "runs once" behavior by comparing a fresh-volume start (`down -v`) against a plain restart

### New: nginx-proxy as its own published repo
- Moved the proxy out of the calculator repo entirely, into its own repo (`calc-nginx-proxy`), built and pushed to Docker Hub as `pilchfish/calc-nginx-proxy`
- Made the proxy's forwarding target configurable via a `PROXY_TARGET` environment variable, using nginx's built-in template mechanism: a file in `/etc/nginx/templates/` ending in `.template` gets run through `envsubst` automatically at container startup, substituting real environment variable values into `${PLACEHOLDER}` spots
- Learned two real gotchas along the way: the template must contain only what belongs *inside* `http {}` (the base image already provides the outer `events {}`/`http {}` wrapper — including it caused an `"events" directive is not allowed here` error), and the base image's default `conf.d/default.conf` needs removing to avoid a duplicate `server` block listening on the same port
- The calculator repo's `docker-compose.yml` now references `image: pilchfish/calc-nginx-proxy:latest` with `environment: PROXY_TARGET=http://gateway:8080`, instead of `build: ./nginx-proxy` — the calculator repo no longer contains the proxy's source at all
- Considered doing the same split for `logs-db`, but decided against it: the proxy was genuinely generic and reusable, whereas `logs-db`'s schema is intrinsically specific to this project's own data model — there's little to gain from separating something that isn't actually a shared, independent concern

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
docker compose down          # keep data
docker compose down -v       # also wipe volumes (e.g. logs-db data) — use deliberately
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

### The proxy repo (calc-nginx-proxy), on its own

```bash
docker build -t pilchfish/calc-nginx-proxy:latest .
docker run -e PROXY_TARGET=http://example.com -p 8888:80 pilchfish/calc-nginx-proxy:latest
docker push pilchfish/calc-nginx-proxy:latest
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
docker compose exec logs-db psql -U calc_logs -d calc_logs -c "\dt"   # list tables
```

**Healthchecks**
```bash
docker inspect <container> --format='{{json .Config.Healthcheck}}'   # configured check
docker inspect <container> --format='{{json .State.Health}}' | jq    # recent run history
```

**Postgres queries**
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

- **Functions are values** — a function reference without `()` never runs; adding `()` runs it immediately.
- **Closures** (a function returning a function) — used throughout `shared/` for pre-configurable middleware.
- **Middleware** — any function Express calls automatically, recognizable by its `(req, res, next)` (or 4-arg error-handler) shape.
- **ES Modules** vs CommonJS — two module systems that can't mix in one file.
- **`async`/`await` and `fetch`** — a Promise represents a value that isn't ready yet; `await` pauses just the current function. Applies equally to a `fetch` call and a Postgres `pool.query`.
- **Docker build-context isolation** — each service only sees files inside its own build context by default.
- **Container-to-container networking** — Compose gives every service a DNS-resolvable hostname matching its service name.
- **npm packages need their own `node_modules` per location** — unlike your own relative-import code.
- **Reverse proxies vs plain port forwarding** — a port map is a dumb pipe; a proxy makes a decision before forwarding on.
- **New: Docker volumes and stateful containers** — most containers in this project are stateless (destroy and rebuild freely); a database needs a named volume to persist data outside the container's own lifecycle.
- **New: image publishing and multi-repo structure** — a genuinely reusable component (the proxy) can be built, tagged, and pushed as its own image, then referenced by tag from an entirely separate project's compose file, with no shared source code between the two repos.
- **New: nginx config templating** — `envsubst` and the `/etc/nginx/templates/` convention let an image accept runtime configuration (like a forwarding target) without needing project-specific values baked in at build time.
- **New: database initialization scripts** — Postgres's `/docker-entrypoint-initdb.d/` convention runs `.sql` files automatically, but only against a genuinely fresh, empty data volume — not on every restart.

## Next steps / backlog

1. Roll out database logging to the other three backend services and to the 404/500 handlers (currently only wired into successful responses on `add-service`)
2. Give the gateway its own error handling instead of pure pass-through
3. A clearer error response body when `nginx-proxy` rejects a request with 403
4. Redesign to a single endpoint (e.g. `/sum?2+6`) where the gateway parses the expression itself
5. A local reverse-proxy/port-forward (e.g. SSH tunnel) from the Mac to the Pi, instead of typing `pi-docker.local` each time
6. `X-Forwarded-For`-based rate limiting or a simple caching layer at the gateway, as further proxy-concept exercises
7. Revisit the Pi host firewall (`ufw`) idea for IP-based access restriction
8. Build and push an ARM64 (or multi-arch) version of `calc-nginx-proxy` so the Pi pulls a native-architecture image