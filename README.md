# Calculator Microservices Project

## What this project does

A calculator API, built as a learning project to cover Node.js/Express, Docker, and Raspberry Pi deployment together. It started as a single service and grew into a small microservices system:

- **Four backend services** — `add-service`, `subtract-service`, `multiply-service`, `divide-service` — each a tiny, independent Node/Express app handling one arithmetic operation
- **A gateway service** in front of them, accepting requests on one port and routing each to the correct backend over Docker's internal container-to-container network
- Each service exposes a `/health` endpoint, checked continuously by Docker Compose healthchecks
- The whole stack runs via Docker Compose, both on a Mac (for development) and a Raspberry Pi 4 (the deployment target)

## Accomplishments so far

### Foundations
- Built and tested a single-service Node/Express calculator API locally, then containerized it with Docker
- Debugged a `pacage*.json` → `package*.json` typo and a port-mismatch bug (`parseArgs` defaulting to port 3000 regardless of `docker run -p`)
- Originally planned to deploy on a Raspberry Pi Zero 2 W; discovered the actual board on hand was an original Pi Zero 1.1 (ARMv6 — not supported by modern Docker or Node images) and switched to a Raspberry Pi 4
- Installed Docker on the Pi 4 in **rootless mode**
- Got the single-service API fully working on the Pi 4 over the home network

### Microservices split
- Split the calculator into four independent services, each with its own Dockerfile, orchestrated with one `docker-compose.yml`
- Discovered the project was using **ES Modules** (`import`/`export`) rather than CommonJS — kept it, since ES Modules is the modern standard

### Shared code refactor
- Extracted shared middleware into `shared/`: `loggers.js`, `validation.js`, `responses.js` — all using the **closure pattern** (a function that returns a function) so each service can configure its own `serverType`
- Fixed a Docker **build-context bug**: `shared/` wasn't reachable from each service's container until the Compose build context was set to the repo root and each Dockerfile's `COPY` paths mirrored the local nested folder structure
- Switched hardcoded per-service values (port, endpoint, serverType, symbol) to **environment variables** set per-service in `docker-compose.yml`
- Fixed several "called too early instead of handed to Express" bugs — `requestLogger`, `validateNumbers`, `serverStartUp` — where a closure-returning function was called directly instead of being passed to Express to call later
- Kept divide-by-zero validation local to `divide_server.js` rather than in shared code, since shared code shouldn't need to know which specific service is calling it
- Added proper error handling: a 404 catch-all (`apiResponseEndpointNotFound`) and a 500 error handler (`apiResponseUnknownServerError`, using Express's special 4-argument `(err, req, res, next)` signature)
- Set up local (non-Docker) development using `node --watch --env-file=.env`, with a `.env` per service mirroring the Compose environment variables

### Developer experience
- Replaced Compose's `sync+restart` watch action with **nodemon** running inside each container, so Compose only needs to `sync` files in while nodemon handles restarting Node
- Added Compose **healthchecks** (hitting each service's `/health` endpoint) with a `start_period` to avoid startup races
- Set up a Colima profile running an ARM64 VM, to build/test ARM64 images locally on an Intel Mac before deploying to the Pi

### Gateway
- Built a gateway service that receives requests on one port and forwards them to the correct backend using **container-to-container networking** (Docker Compose service names act as hostnames)
- Kept it a transparent pass-through for now — relays the backend's exact status code and body
- Confirmed working end-to-end: a request to the gateway is correctly routed, processed by the right backend, and the result relayed back

## How to run

### With Docker Compose (recommended)

```bash
docker compose up --build --watch
```
- `--build` rebuilds images if anything's changed
- `--watch` syncs local file changes into the running containers (nodemon then restarts Node inside the container)

Once running, hit the gateway:
```bash
curl "http://localhost:8080/add?a=5&b=3"
```
Or individual services directly:
```bash
curl "http://localhost:8081/add?a=5&b=3"       # add-service
curl "http://localhost:8082/subtract?a=10&b=4"  # subtract-service
curl "http://localhost:8083/multiply?a=3&b=7"   # multiply-service
curl "http://localhost:8084/divide?a=20&b=4"    # divide-service
```

Stop everything:
```bash
docker compose down
```

### Locally with Node (no Docker) — faster iteration for one service at a time

Each service folder has a `.env` file (gitignored) mirroring its Compose environment variables:
```
PORT=8080
ENDPOINT=/add
SERVER_TYPE=add-service
SYMBOL=+
```

Run a single service directly:
```bash
cd calculator-microservices/add-service
node --watch --env-file=.env add_server.js
```
`--watch` restarts Node automatically on file changes; `--env-file` loads the `.env` values into `process.env`, the same values Docker Compose would otherwise supply.

## Useful Docker & Compose commands

**Building and running**
```bash
docker compose up --build              # rebuild and start everything
docker compose up --build --watch      # same, plus live file sync
docker compose up --build add-service  # rebuild and start just one service
docker compose down                    # stop and remove all containers
```

**Inspecting running containers**
```bash
docker compose ps                      # status of all services
docker ps -a                           # all containers, including stopped
docker images                          # all built images
```

**Logs**
```bash
docker compose logs -f                       # follow logs from all services, interleaved
docker compose logs -f add-service           # follow logs from just one service
docker compose logs -f | grep -v '/health'   # hide the constant healthcheck noise
```

**Getting inside a running container**
```bash
docker compose exec add-service sh     # interactive shell inside a running container
docker compose exec add-service sh -c "wget -qO- http://localhost:8080/health"  # one-off command
```

**Cleaning up**
```bash
docker compose down --rmi all          # also remove the images Compose built
docker system prune                    # remove stopped containers, unused networks, dangling images
```

## Healthchecks — what they are and how to inspect them

Each backend service has a Compose healthcheck:
```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
  interval: 10s
  timeout: 3s
  retries: 3
  start_period: 15s
```
Docker runs this command **continuously**, every 10 seconds, for the entire life of the container — not just once at startup. This is why `docker compose logs -f` shows a steady stream of `GET /health` lines: that's Docker itself checking in on each service, not a bug or something to fix. `start_period` gives the container a 15-second grace period after starting before failed checks start counting, avoiding false "unhealthy" reports while nodemon/Node are still booting.

**Check a container's live health status:**
```bash
docker compose ps
```
Shows `(healthy)` or `(unhealthy)` next to each service.

**See the actual configured healthcheck Docker is using:**
```bash
docker inspect <container-name> --format='{{json .Config.Healthcheck}}'
```

**See the healthcheck's recent run history (timestamps, exit codes, output):**
```bash
docker inspect <container-name> --format='{{json .State.Health}}' | jq
```

The gateway depends on all four backends reporting healthy before it starts:
```yaml
depends_on:
  add-service:
    condition: service_healthy
  # ...same for the other three
```

## JavaScript & Node concepts learned along the way

- **Arrow functions**: `(a, b) => a + b` is shorthand for `function(a, b) { return a + b; }`. With one parameter, parentheses are optional; with a single-expression body, `return` and `{ }` can be dropped (implicit return).
- **Functions are values**: writing a function's name without `()` never runs it — it's just a reference. Adding `()` runs it immediately. This single rule was the root cause of nearly every bug hit during the middleware refactor.
- **Closures (a function returning a function)**: used throughout `shared/` so middleware can be pre-configured with a value (like `serverType`) before Express calls the returned inner function later, once per request. `requestLogger('add-service')` runs immediately and returns the real `(req, res, next)` middleware; Express calls *that*, not `requestLogger` itself.
- **Middleware**: any function Express itself calls automatically, as part of handling a request, rather than one you call directly. Recognizable by its shape — `(req, res, next)` for normal middleware, `(err, req, res, next)` (exactly 4 parameters, `err` first) for error handlers — and by being handed to `app.use()`, `app.get()`, etc. rather than called directly in your own code.
- **CommonJS vs ES Modules**: `require`/`module.exports` (CommonJS) vs `import`/`export` (ES Modules) are two different module systems that can't be mixed in one file. `package.json`'s `"type"` field sets the default for `.js` files; `.mjs`/`.cjs` extensions override it per file. This project uses ES Modules throughout.
- **Named vs default exports**: named exports (`export function x`) are imported with matching curly braces and exact names; default exports (`export default x`) are imported without braces and can be renamed freely.
- **`async`/`await` and `fetch`**: `fetch(url)` returns a Promise — a value that isn't ready yet. `await` pauses *that specific function* until the Promise resolves, without freezing the whole program; other requests can still be handled while one is paused waiting. This is what lets the gateway make a request to a backend service and wait for its response before replying to the original caller.
- **Docker build-context isolation**: each service in a multi-container project only sees files inside its own build context by default. Sharing code across services means widening the build context and making the container's internal folder structure mirror the local one, so relative imports resolve identically in both places.
- **Container-to-container networking**: Docker Compose gives every service a DNS-resolvable hostname matching its service name — `http://add-service:8080` works from inside any other container on the same Compose network, no IP addresses or port-mapping needed.

## Next steps

1. **Deploy the full stack (including the gateway) to the Pi 4** — `git clone`, `docker compose up --build -d`
2. **Manually recreate the gateway's networking outside Compose** — `docker network create`, `--network`/`--name` flags — to fully understand what Compose automates
3. Revisit the gateway to add its own error handling, rather than pure pass-through
4. Consider a redesigned single endpoint (e.g. `/sum?2+6`) where the gateway parses the expression and determines the operation itself
5. Convert other shared functions to the "return a function" pattern where it's actually needed (and keep plain functions where it isn't)
6. Better handle requests to genuinely unknown routes across the whole stack
