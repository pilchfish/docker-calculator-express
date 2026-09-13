Good habit to build early — cleaning up while you're iterating on Dockerfiles avoids confusion from stale images lying around. Here's the full picture, from targeted to broad.

**1. Stop and remove a specific container**

```bash
docker ps -a                          # find the container name/ID (add -a to include stopped ones)
docker stop <container-name-or-id>    # stop it if it's running
docker rm <container-name-or-id>      # remove it
```
Or combine both in one go if it's already stopped:
```bash
docker rm -f <container-name-or-id>   # -f forces removal, stopping it first if needed
```

**2. Remove a specific image**

```bash
docker images                          # find the image name/ID
docker rmi <image-name-or-id>
```
Note: Docker won't let you remove an image while a container (even a stopped one) still references it — remove the container first, then the image.

**3. Since you're using Compose, there's an easier way for your actual workflow**

```bash
docker compose down
```
This stops and removes **all** containers defined in your `docker-compose.yml` in one command — much more convenient than doing it one-by-one while you're actively iterating on multiple services.

To also remove the images Compose built (not just the containers):
```bash
docker compose down --rmi all
```

**4. Broader cleanup commands, useful once things pile up**

```bash
docker system df           # see how much space images/containers/etc are using
docker container prune     # remove ALL stopped containers
docker image prune         # remove dangling (untagged, unused) images
docker image prune -a      # remove ALL unused images, not just dangling ones — more aggressive
docker system prune        # removes stopped containers, unused networks, dangling images all at once
```

**Given what you're actually doing right now** — iterating on a Dockerfile fix and rebuilding — the command you'll want most often is simply:
```bash
docker compose down
docker compose up --build add-service
```
`down` clears out the old container, `--build` on the way back up forces Docker to rebuild the image fresh with your latest Dockerfile changes, rather than risk reusing a stale cached layer from before your fix.