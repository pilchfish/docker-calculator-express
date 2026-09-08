## Step 3: Add a .dockerignore

─ node --eval "fs.writeFileSync('.dockerignore','# Ignore artifacts:\nnode_modules\njavascript_syntax_learnit.js\n')"

Create a file called .dockerignore alongside your Dockerfile:
`node_modules`

This stops your local node_modules folder from being copied into the container — you want the container to install its own dependencies fresh via npm install, not copy over whatever's on your Mac (which could even be built for the wrong architecture).


## Step 4: Build and run it
```bash
docker build -t calculator-api .
docker run -p 8080:8080 calculator-api
```

`docker build -t calculator-api .` — builds the image from the Dockerfile in the current folder (.), naming it calculator-api.
`docker run -p 8080:8080 calculator-api` — starts a container from that image, mapping port 8080 on your Mac to port 8080 inside the container.

#### Test the same browser URLs as before (http://localhost:8080/add?a=5&b=3) — should work identically to running it with plain node server.js, just now inside a container.



# debugging docker build

Good catch on the error message — the fix is right there in your build output. Look at this line:
=> CACHED [3/5] COPY pacage*.json ./
There's a typo: pacage*.json instead of package*.json — missing the "k". Docker copied nothing (since no file matches pacage*.json), so when npm install ran, there was no package.json inside the container at all, hence ENOENT: no such file or directory.
The fix: open your Dockerfile and correct that line:
dockerfile
COPY package*.json ./
(Just fixing the typo — same line, same purpose, spelled right this time.)
One extra thing to check: rebuild after fixing it, but note that first line says CACHED — Docker cached that broken copy step. After you fix the typo, Docker will detect the file changed and won't use the stale cache, so a normal rebuild should be enough:
bash
docker build -t calculator-api .
If you ever suspect Docker is using a stale cache for some other reason, you can force a clean rebuild with:
bash
docker build --no-cache -t calculator-api .
but you shouldn't need --no-cache here — fixing the typo is enough since the file content actually changes.
