Good idea — but worth a small correction first, since Docker Compose's actual "profiles" feature does something different than what you're picturing, and there's a better tool for this specific job.

**What Compose "profiles" actually do**

Profiles are for toggling *which services run at all* (e.g., "only start the debug tools in dev, skip them in prod") — not for varying a config value like an interval across environments. So profiles aren't quite the right tool here, even though the word matches your intent.

**What actually solves this: environment variable interpolation in your compose file**

Compose lets you reference a variable directly inside the YAML itself, with a fallback default:

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
  interval: ${HEALTHCHECK_INTERVAL:-10s}
  timeout: 3s
  retries: 3
  start_period: 15s
```

`${HEALTHCHECK_INTERVAL:-10s}` means "use the `HEALTHCHECK_INTERVAL` environment variable if it's set, otherwise default to `10s`."

**Setting it per environment**

Create a `.env` file at the repo root (this is a special Compose-recognized file, separate from each service's own `.env`):
```
# .env (repo root) — dev defaults
HEALTHCHECK_INTERVAL=30s
```
Then for staging/production, you'd override it when running Compose, without needing to touch the YAML at all:
```bash
HEALTHCHECK_INTERVAL=10s docker compose up --build -d
```
or by using a separate env file per environment:
```bash
docker compose --env-file .env.production up --build -d
```

**An alternative, arguably cleaner approach for your case: separate override files**

Compose supports layering multiple YAML files together — a base file plus environment-specific overrides:

```yaml
# docker-compose.yml (base — used everywhere)
services:
  add-service:
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      timeout: 3s
      retries: 3
      start_period: 15s
```
```yaml
# docker-compose.override.yml (dev — loaded automatically alongside the base file, no flag needed)
services:
  add-service:
    healthcheck:
      interval: 30s
```
```yaml
# docker-compose.prod.yml (staging/production)
services:
  add-service:
    healthcheck:
      interval: 10s
```
```bash
# dev — override file loads automatically
docker compose up --build

# production — explicitly layer the prod file instead
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

**Which would I suggest for a project this size?**

Given you're one person, on one machine, moving between "dev on my Mac" and "eventually on the Pi" — the **`.env` variable approach** is simpler to reason about (one YAML file, one changing value) than maintaining multiple full override files, which starts paying off more once a team or a more complex deployment pipeline is involved. I'd start with the `${HEALTHCHECK_INTERVAL:-10s}` approach.

Want to set that up across all four services now, with `30s` as your local dev default?