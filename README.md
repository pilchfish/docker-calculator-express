With help and guidance of Claude.ai I am making a simple api to take care of simple 2 digit mathmatical equations, add, subtract, multiply and divide. 

using Node, Javascript and Express with the intent to run via Docker

Why... Javascript. I wanted to host Docker on a Raspberry Pi and at the time all I had was a Pi Zero 2 W and needed a small code footprint for the api and server given its 512mb RAM. This ended in tears as it turned out out all i had was a Pi Zero 1.1 not 2, which cannot run Docker. 

Luckily I found a Pi 4 which rocks Docker and the boasts a larger RAM capacity. 

Why Docker, because I need to get my hands dirty and transporting Docker off my local machine I hoped it would feel more like a aws/gcp cloud set up and allow me to visualise Docker and its containers as a phyical device in the shape of a rpi rather than a blurry shadow underneath my laptops keybpard. 




# Calculator Microservices Project

A learning project: a calculator API built with Node.js/Express, containerized with Docker, and deployed to a Raspberry Pi 4 — first as a single service, then split into four independent microservices orchestrated with Docker Compose.

## Progress so far

- Built and tested a single-service Node/Express calculator API locally on Mac
- Containerized it with Docker, debugged a typo bug (`pacage*.json` → `package*.json`) and a port mismatch bug (`parseArgs` defaulting to port 3000 regardless of `docker run -p` flags)
- Originally planned to deploy on a Raspberry Pi Zero 2 W, discovered the actual board on hand was an original Pi Zero 1.1 (ARMv6 — not supported by modern Docker or Node images), switched to a Raspberry Pi 4 instead
- Installed Docker on the Pi 4 in **rootless mode** (`dockerd-rootless-setuptool.sh install`)
- Got the single-service calculator API fully working on the Pi 4, reachable over the home network, confirmed via `docker logs`
- Split the calculator into **four independent microservices** (add, subtract, multiply, divide), each its own Node/Express app and Dockerfile
- Wrote a `docker-compose.yml` to orchestrate all four services together, confirmed working locally on the Mac with interleaved logs (`docker compose logs -f`)
- Pushed the microservices project to GitHub

## Next steps

### Deploy microservices to the Pi (steps 7–8 of original plan)

1. SSH into the Pi 4
2. `git clone` the repo
3. `cd` into the parent project folder
4. `docker compose up --build -d`
5. Test each service from the Mac's browser at its mapped port:
   - `http://<pi-ip>:8081/add?a=5&b=3`
   - `http://<pi-ip>:8082/subtract?a=10&b=4`
   - `http://<pi-ip>:8083/multiply?a=3&b=7`
   - `http://<pi-ip>:8084/divide?a=20&b=4`
6. Use `docker compose logs -f` to watch all four services' logs together in real time

### Refactor plan for the microservices project

1. **Extract the shared `validateNumbers` middleware** into a `shared/validate.js` file at the parent level, instead of duplicating it in all four services
2. **Make the shared file reachable inside each container** — each service is its own isolated Docker build context, so a parent-level `shared/` folder isn't automatically visible inside a container. Add something like `COPY ../shared ./shared` in each Dockerfile, or restructure the build context so all four can reach it
3. **Switch from the `parseArgs`/`--port` command-line approach to environment variables** — read `process.env.PORT || 8080` in code, and set `environment: - PORT=8080` per service in `docker-compose.yml`. This is the more idiomatic Docker pattern
4. **Review the four Dockerfiles for consistency** now that `shared/` exists, making sure `COPY` lines line up across all four
5. **Standardize the JSON error response format** across all four services — always `{ "error": "message" }` with a 400 status for invalid input
6. **Retest after each individual change** with `docker compose up --build`, rather than batching multiple refactor steps together before testing

## Key concepts learned along the way

- **Image vs container**: an image is the built blueprint (`docker build`); a container is a running instance of that image (`docker run`)
- **`EXPOSE` in a Dockerfile is documentation only** — it does not open ports or affect routing; the actual port mapping comes from `-p` on `docker run` or `ports:` in Compose
- **Build time vs run time**: `--build-arg`/`ARG` operate at build time; `CMD` arguments and environment variables operate at run/start time — a mismatch between these was the cause of the port 3000 vs 8080 bug
- **Docker images bundle their own runtime** — the Pi doesn't need Node installed at all, since the `node:20-alpine` base image carries its own Node installation inside the container
- **ARM architecture matters**: ARMv6 boards (original Pi Zero, Pi Zero W, Pi 1) are not supported by modern Docker or official Node images; ARMv7 and up (Pi 2, 3, Zero 2 W, 4, 5) work normally
- **Rootless Docker** runs the daemon without root privileges, at the cost of a different socket path and some limitations (e.g. binding to ports below 1024 needs extra config)
- **Docker Compose build context isolation**: each service in a multi-container project only sees files within its own build context by default — sharing code across services needs to be deliberately wired up



junk to be removed 

1
Extract the shared validateNumbers middleware
Right now each service repeats the same validateNumbers function word-for-word. Create a shared folder (e.g. shared/validate.js) at the parent level containing just that function, exported with module.exports. This is the single biggest duplication in the project and the most valuable one to fix first.
2
Make the shared file reachable from each container
Since each service is its own independent Docker build context, a file sitting in a parent shared/ folder isn't automatically visible inside each service's container. The cleanest fix: in each service's Dockerfile, add a COPY ../shared ./shared line (or restructure so shared/ sits inside a common parent that all four COPY commands can reach). This is a good moment to learn a real constraint of multi-service Docker projects: containers can't casually reach files outside their own build context without you explicitly wiring it up.
3
Switch from parseArgs to environment variables for the port
Swap out the parseArgs/--port command-line approach for Docker's more idiomatic environment variable pattern: read process.env.PORT || 8080 in server.js, and set environment: - PORT=8080 in docker-compose.yml for each service instead of relying on CMD arguments. This is the standard way real-world containerized apps handle configuration, and removes the parseArgs dependency entirely.
4
Review the four Dockerfiles for consistency
Right now your four Dockerfiles are near-identical copies. Once shared/ exists, double check each Dockerfile's COPY lines are consistent and nothing is duplicated unnecessarily. This won't remove the four separate Dockerfiles (each service still needs its own, since they're independently built and deployed) but ensures they stay in sync as templates of each other.
5
Standardize error response format across all four services
Each service currently returns errors slightly differently if you copy-pasted and tweaked over time. Standardize on one JSON error shape across all four, e.g. always { "error": "message" } with the same 400 status for bad input, so a client calling any of the four services can rely on one consistent response format.
6
Retest after each change
After each change above, rerun docker compose up --build locally on the Mac and retest all four endpoints before moving on to the next refactor step. Refactoring one thing at a time and testing after each keeps you from having to debug multiple changes at once if something breaks.
