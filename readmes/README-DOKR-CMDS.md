Glad that one's useful — it's a good habit for exactly this kind of situation: testing one change in isolation before rolling it out everywhere else.

A couple of related variations worth knowing while we're on it:

- `docker compose up --build` (no service name) — rebuilds and starts *all* services, which you'll use once all four are updated and you want to bring the whole stack back up together.
- `docker compose stop add-service` — stops just that one service without touching the others.
- `docker compose logs -f add-service` — follows logs for just that one service, useful once you have four running at once and don't want everything interleaved.

Let me know how the `add-service` test goes, and we'll roll the same change out to the other three whenever you're ready.