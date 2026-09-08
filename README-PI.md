Excellent — let's get Docker installed.
1. Install Docker using the official convenience script
bash
curl -sSL https://get.docker.com | sh
This detects your Pi's architecture automatically (it'll grab the ARM64 build since you're on 64-bit Raspberry Pi OS) and installs Docker Engine plus the docker compose plugin.
2. Let your user run Docker without sudo
bash
sudo usermod -aG docker $USER
This adds your current user to the docker group. It won't take effect in your current SSH session though — you need to either log out and back in, or just run:
bash
newgrp docker
to refresh your group membership in the current session without a full reconnect.
3. Verify it worked
bash
docker run hello-world
This pulls a tiny test image and runs it — if you see a message starting with "Hello from Docker!", everything's working correctly and you're set up without needing sudo for future commands.
4. Double-check your architecture (good habit, confirms 64-bit is really active)
bash
uname -m
You should see aarch64 — that confirms you're running 64-bit, which is what lets Docker pull the right images automatically without any of the ARMv6 headaches from before.
Give those a go and let me know what you see — especially the hello-world output, since that's the real confirmation everything's wired up correctly.








pilch@pi-docker:~ $ docker run hello-world
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
58dee6a49ef1: Pull complete 
c3bdf82c34d1: Download complete 
Digest: sha256:5dd0d3e6e255913fc30f90b9f2b1d359cc2cbdb48090cc4b65f1676e203243cc
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (arm64v8)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/







$ sudo apt update && sudo apt install uidmap

$ dockerd-rootless-setuptool.sh install



Good call, and good to know — rootless Docker is actually a nice choice, more secure by default since the Docker daemon itself doesn't run as root at all (rather than just letting your user run `docker` commands without typing `sudo`). A couple of small things worth knowing since you went this route:

**The socket path is different**

Rootless Docker doesn't use the standard `/var/run/docker.sock` — instead it typically runs at something like `/run/user/<your-uid>/docker.sock`. The install script usually prints out an export line for this, something like:
```bash
export DOCKER_HOST=unix:///run/user/1000/docker.sock
```
If that's not already added to your `~/.bashrc` (the script sometimes does this for you, sometimes tells you to do it manually), make sure it's there so `docker` commands work correctly in every new SSH session — otherwise you might get a "cannot connect" error similar to the very first one you hit on your Mac.

**Port binding under 1024 needs an extra step**

One quirk of rootless mode: binding to ports below 1024 (like port 80 for a website) doesn't work out of the box without extra configuration, since only root can normally do that. For your calculator API on port 8080, this isn't a concern at all — 8080 is well above that threshold, so you're totally fine here. Just flagging it in case you remember it later when we get to the website project and want port 80.

**Everything else stays the same** — `docker build`, `docker run`, `docker ps`, etc. all work identically day-to-day, rootless is really just a different way the daemon itself is set up underneath.

Did `docker run hello-world` come back successfully? If so, you're ready to get your calculator project onto the Pi next.








 Great, Docker's fully confirmed working in rootless mode on the Pi 4. Next step is getting your calculator code onto the Pi.
The simplest path, as planned earlier: push it to GitHub from your Mac, then clone it on the Pi.
On your Mac (if you haven't already):
bash
cd your-calculator-project
git init
git add .
git commit -m "Calculator API with Express"
Then create a new repo on GitHub (via the website), and push:
bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
On the Pi, over your SSH session:
bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
