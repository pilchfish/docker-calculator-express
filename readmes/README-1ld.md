# Calculator Microservices Project

A learning project: a calculator API built with Node.js/Express, containerized with Docker, and deployed to a Raspberry Pi 4 — first as a single service, then split into four independent microservices orchestrated with Docker Compose.

## Progress so far

### Foundations
- Built and tested a single-service Node/Express calculator API locally on Mac
- Containerized it with Docker, debugged a typo bug (`pacage*.json` → `package*.json`) and a port mismatch bug (`parseArgs` defaulting to port 3000 regardless of `docker run -p` flags)
- Originally planned to deploy on a Raspberry Pi Zero 2 W, discovered the actual board on hand was an original Pi Zero 1.1 (ARMv6 — not supported by modern Docker or Node images), switched to a Raspberry Pi 4 instead
- Installed Docker on the Pi 4 in **rootless mode** (`dockerd-rootless-setuptool.sh install`)
- Got the single-service calculator API fully working on the Pi 4, reachable over the home network, confirmed via `docker logs`

### Microservices split
- Split the calculator into **four independent microservices** (add, subtract, multiply, divide), each its own Node/Express app and Dockerfile
- Wrote a `docker-compose.yml` to orchestrate all four services together, confirmed working locally on the Mac with interleaved logs (`docker compose logs -f`)
- Pushed the microservices project to GitHub
- Discovered the project is using **ES Modules** (`import`/`export`, `"type": "module"`) rather than CommonJS — this happened unintentionally early on after fixing an error, then got copied across all four services. ES Modules is the modern standard, so this was kept rather than converted back

### Shared code refactor (in progress)
- Extracted shared middleware into a `shared/` folder at the repo root: `loggers.js`, `validation.js`, `responses.js` (health check)
- Standardized on the **closure pattern** (a function that returns a function) for all shared middleware, so each service can pass in its own `serverType` — e.g. `requestLogger(serverType)` returns the actual `(req, res, next)` middleware Express calls
- Fixed a Docker **build-context bug**: `shared/` wasn't reachable from inside each service's container, because Docker only sees files inside whatever folder it's told to build from. Solved by pointing each service's Compose build context at the repo root and updating each Dockerfile's `COPY` paths to mirror the local nested folder structure (`calculator-microservices/<service>/` and `shared/`), so relative imports like `../../shared/loggers.js` resolve identically locally and in the container
- Switched hardcoded per-service values (`port`, `endpoint`, `serverType`, `symbol`) to **environment variables** set per-service in `docker-compose.yml`, instead of hardcoding them in each `server.js` — this made the four `server.js` files nearly identical, with the differences living in one place (the compose file)
- Fixed an `app.listen(port, serverStartUp(...))` bug: calling `serverStartUp` immediately (instead of passing it as a callback for Express to call once the server starts) meant `app.listen()` received `undefined` instead of a function, crashing the server. Fixed by having `serverStartUp` itself return a function
- Set up **Docker Compose `watch`** (`sync+restart` action) for live-reloading `add-service` during development, instead of manually re-running `docker compose up --build` after every change
- **`add-service` is fully working end-to-end** with all of the above — env vars, shared folder, fixed `app.listen`, and live watch/reload

## Next steps

### Roll out the refactor to the remaining services
Apply the same pattern used for `add-service` — env vars, shared folder wiring, fixed `app.listen`, watch config — to `subtract-service`, `multiply-service`, and `divide-service`.

### Deploy microservices to the Pi
1. SSH into the Pi 4
2. `git clone` the repo
3. `cd` into the parent project folder
4. `docker compose up --build -d`
5. Test each service from the Mac's browser at its mapped port
6. Use `docker compose logs -f` to watch all four services' logs together in real time

### Ideas for later
- Convert other shared functions to the same "return a function" pattern used for the fixed `serverStartUp`
- Use `nodemon` inside the container to auto-restart Node on file changes, instead of relying on Compose's `sync+restart` watch action
- Better handle errors when an undefined URL is requested, or the wrong endpoint is hit on a service (e.g. requesting `/subtract` on `add-service`)
- **Add a gateway container** in front of the four microservices that receives all requests and routes them to the correct backend service — this would also introduce container-to-container communication over Compose's internal network (services reaching each other by name, e.g. `http://add-service:8080`)
- Standardize the JSON error response format across all four services (e.g. always `{ "error": "message" }` with a 400 status for invalid input)

## Key concepts learned along the way

- **Image vs container**: an image is the built blueprint (`docker build`); a container is a running instance of that image (`docker run`)
- **`EXPOSE` in a Dockerfile is documentation only** — it does not open ports or affect routing; the actual port mapping comes from `-p` on `docker run` or `ports:` in Compose
- **Build time vs run time**: `--build-arg`/`ARG` operate at build time; `CMD` arguments and environment variables operate at run/start time
- **Docker images bundle their own runtime** — the Pi doesn't need Node installed at all, since the `node:20-alpine` base image carries its own Node installation inside the container
- **ARM architecture matters**: ARMv6 boards (original Pi Zero, Pi Zero W, Pi 1) are not supported by modern Docker or official Node images; ARMv7 and up (Pi 2, 3, Zero 2 W, 4, 5) work normally
- **Rootless Docker** runs the daemon without root privileges, at the cost of a different socket path and some limitations (e.g. binding to ports below 1024 needs extra config)
- **Docker Compose build context isolation**: each service in a multi-container project only sees files within its own build context by default — sharing code across services needs to be deliberately wired up, and the container's internal folder structure needs to mirror the local one for relative imports to resolve correctly
- **CommonJS vs ES Modules**: `require`/`module.exports` (CommonJS) vs `import`/`export` (ES Modules) are two different module systems that can't be freely mixed in one file; `package.json`'s `"type"` field decides the default for `.js` files, while `.mjs`/`.cjs` extensions can override it per file
- **Named vs default exports**: named exports (`export function x`) are imported with matching curly braces and exact names; default exports (`export default x`) are imported without braces and can be renamed freely on import
- **Functions are values** — a function reference without `()` never runs; adding `()` runs it immediately. This underlies the recurring "function that returns a function" (closure) pattern used throughout this project's shared middleware, and was the root cause of several bugs: passing `requestLogger` instead of `requestLogger(serverType)` to Express, calling `validateNumbers` immediately instead of letting Express call the returned inner function, and calling `serverStartUp` immediately instead of returning a callback for `app.listen()`
- **`.bind()`** is an alternative way to pre-fill a function's arguments (partial application), achieving a similar result to the closure pattern via a different mechanism
- **Docker Compose `watch`**: `sync` copies changed files into a running container but does not restart anything — useful for tools that re-read files fresh each time (static servers, apps with their own file-watching). `sync+restart` also restarts the container process, needed for anything (like Node) that loads code into memory once at startup. `rebuild` does a full image rebuild, needed when dependencies change (e.g. `package.json`)