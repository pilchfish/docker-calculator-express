Good, let's set up from a completely clean slate so we know exactly what exists at each step.

**Get to a clean starting point**

```bash
docker compose down
docker network ls
docker ps -a
```

Confirm:
- `docker network ls` shows only the three built-in ones (`bridge`, `host`, `none`) — no leftover Compose network
- `docker ps -a` shows no containers at all (or none related to this project) — if there are stopped containers from this project still hanging around, remove them: `docker rm <container-name>` for each, or `docker compose down --remove-orphans` to be thorough

Once both come back clean, that's our baseline — everything from here is built by hand, one deliberate step at a time, so you can see exactly what each command contributes.

**Next, we'll do this in stages, testing as we go:**
1. Create a custom network
2. Run just `add-service` on it, confirm it works reachable from the Pi itself
3. Run the gateway on the same network, confirm it can reach `add-service` by name
4. Test from your Mac

Run those three cleanup/check commands and paste what you get — once confirmed clean, I'll give you the actual `docker network create` and first `docker run` command to try.



Good — let's build it up one deliberate piece at a time.

**Step 1: Create the custom network**

```bash
docker network create calc-network
```

This is the manual equivalent of what Compose does automatically for every project — a network that containers can join, and once joined, discover each other by name.

Confirm it exists:
```bash
docker network ls
```


``` bash
pilch@pi-docker:~/codebase/docker-calculator-express $ docker network ls
NETWORK ID     NAME           DRIVER    SCOPE
9f7b2e36d1b1   bridge         bridge    local
76dffe0b9c55   calc-network   bridge    local
716b493e42a0   host           host      local
160accb7719c   none           null      local
```




You should now see `calc-network` alongside the three built-in ones.

**Step 2: Run `add-service` on that network**

```bash
docker run -d \
  --name add-service \
  --network calc-network \
  -p 8081:8080 \
  -e PORT=8080 \
  -e ENDPOINT=/add \
  -e SERVER_TYPE=add-service \
  -e SYMBOL=+ \
  calc_node_docker-add-service
```

A few things to note about this command:
- `--network calc-network` — puts this container on our custom network (this is the manual equivalent of a service block being listed in `docker-compose.yml`)
- `--name add-service` — this name is what becomes the DNS hostname other containers on the same network can use to reach it — matching what your `docker-compose.yml` used as the service key
- `-e KEY=value` — one flag per environment variable, since we're not using a compose file's `environment:` list anymore
- `calc_node_docker-add-service` — replace this with whatever your actual image name is; check with `docker images` if unsure (from earlier logs, your images were named like `calc_node_docker-add-service`)

**Step 3: Confirm it's reachable directly on the Pi**

```bash
curl "http://localhost:8081/health"
```

If that responds correctly, `add-service` is up and correctly bound to the Pi's own network — completely independent of the custom `calc-network` we just made (that's `-p 8081:8080`'s job, same as always).

Run these three steps and let me know what comes back — once `add-service` is confirmed working on its own, we'll bring the gateway in next and test container-to-container communication specifically.






Nice — `add-service` is confirmed reachable directly on the Pi, on its own custom network, entirely by hand. That's the first real building block in place.

**Next: bring the gateway in, on the same network, and test container-to-container communication specifically**

```bash
docker run -d \
  --name gateway \
  --network calc-network \
  -p 8080:8080 \
  -e PORT=8080 \
  docker-calculator-express-gateway
```

(swap in your actual gateway image name if it differs — check with `docker images` if unsure)

**Now the important test — this is the whole point of the exercise**

```bash
curl "http://localhost:8080/add?a=5&b=3"
```

This request goes: your `curl` → the gateway container (via the host port mapping, same as `add-service`) → the gateway's own code makes an internal request to `http://add-service:8080/add` → which only works because **both containers are on `calc-network` together**, so Docker's internal DNS resolves the name `add-service` to the right container's internal IP.

**If this works**, you've just proven, entirely by hand, the exact mechanism Compose was doing automatically the whole time — no more mystery about what "service name resolves as hostname" actually means under the hood.

**If it fails specifically at this step** (rather than the direct `add-service` call), that's actually a very informative failure — it would mean the gateway container itself can't reach `add-service` by name, which is *exactly* the kind of problem that could explain why your original Compose deployment on the Pi wasn't responding to requests, even though containers were "up." Worth checking directly from inside the gateway container if this happens:
```bash
docker exec -it gateway sh
wget -qO- http://add-service:8080/health
```

Try starting the gateway and the `curl` test through it — let's see if it resolves cleanly or if we've actually found the root of your original deployment issue.



That's a genuinely solid result — the whole chain works end to end, built entirely by hand: custom network → `add-service` on it → gateway on it too → gateway resolves `add-service` by name → request flows through and back correctly.

**What this tells us about your original Compose-on-the-Pi problem**

Since the *identical* underlying mechanism (custom network, container-to-container DNS resolution, port mapping) works perfectly when done manually, this strongly suggests the earlier failure wasn't a fundamental networking problem at all — Docker's networking on the Pi is clearly working correctly. That points the finger back toward something more specific to *how Compose was configured or run* on the Pi that one time — possibly something like:
- An environment-variable or `.env` file difference between your Mac and the Pi (e.g., the root-level `.env` for `HEALTHCHECK_INTERVAL` not being present on the Pi, though that specifically shouldn't block requests)
- A stale image on the Pi from an earlier build, before some of today's fixes were pushed to GitHub
- The Pi simply not having pulled the very latest code with all of today's fixes at the time you tested it

**A good next step**: rather than keep debugging this manual setup further (since it's now proven the concept works), tear this down and try the *actual* Compose deployment again on the Pi, freshly, making sure it's pulling your latest pushed code:

```bash
docker rm -f add-service gateway
docker network rm calc-network
```

Then on the Pi:
```bash
cd ~/codebase/docker-calculator-express
git pull
docker compose down --remove-orphans
docker compose up --build -d
curl "http://localhost:8080/add?a=5&b=3"
```

Given the networking concept is now proven correct by hand, if this *still* fails, we'd know to look specifically at what's different between your manual setup and the Compose one — most likely something in the compose file's config values or a build/cache issue — rather than doubting Docker's networking itself.

Want to try that fresh Compose pull-and-redeploy now that you've got the mental model solid?



