# this maps to the kusomize-kubectl.md file details
before I forget how would I set this up in compose.



Good thing to pin down while it's fresh — Compose actually has two mechanisms that cover this, and you've technically already used one of them today (or a version of it) without necessarily connecting it to what Kustomize just did.

**Option 1: Environment variable interpolation — the more direct equivalent**

You've already used this pattern for `HEALTHCHECK_INTERVAL` earlier in the project:
```yaml
nginx-proxy:
  image: pilchfish/docker-nginx-proxy:${PROXY_IMAGE_TAG:-latest}
```
Then, per environment:
```bash
# On the Mac, local dev — defaults to :latest
docker compose up

# On the Pi
PROXY_IMAGE_TAG=arm64 docker compose up
```
or via a `.env` file at the repo root on the Pi specifically:
```
# .env (on the Pi only, not committed if it's Pi-specific)
PROXY_IMAGE_TAG=arm64
```

This is genuinely the most direct Compose equivalent of what Kustomize's `images: newTag:` override just did — one placeholder, swapped per environment.

**Option 2: Layered override files — the equivalent of Kustomize's `base/` + `overlays/`**

This is the thing you put on the backlog a while back and never circled back to — now's a natural moment, since it's structurally the *same idea* as what you just built with Kustomize, just Compose's own version of it:

```yaml
# docker-compose.yml (base — checked into git, generic)
nginx-proxy:
  image: pilchfish/docker-nginx-proxy:latest
```
```yaml
# docker-compose.pi.yml (Pi-specific override)
services:
  nginx-proxy:
    image: pilchfish/docker-nginx-proxy:arm64
```
```bash
docker compose -f docker-compose.yml -f docker-compose.pi.yml up --build -d
```

**Which one actually maps most closely to what you just did with Kustomize?**

Option 2 is the truer structural equivalent — `base/` + `overlays/pi/` is precisely "one shared definition, a named override file layered on top for one specific environment," which is exactly Compose's `-f file1 -f file2` layering mechanism. Option 1 (env var interpolation) is simpler for a single value like a tag, but doesn't scale the same way to overriding multiple different fields at once the way a whole override *file* can.

**Practically, for just this one tag value**, Option 1 is probably the more proportionate choice — you already have the mechanism (`${VAR:-default}`) proven out from the healthcheck interval, and pulling in a whole second compose file just to change one image tag would be a bit heavy-handed. I'd save the full override-file approach for if/when you find yourself wanting to change *several* things between Mac and Pi at once, not just this one tag.