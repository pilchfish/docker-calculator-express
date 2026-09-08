# starts from an official Node.js image, version 20, 
# using the alpine variant (a stripped-down Linux distro that keeps the image small 
#— important given the Pi Zero's limited storage). 
# This image already has Node and npm installed, so you don't have to install them yourself.
FROM node:20-alpine


# creates a folder called /app inside the container 
# and makes it the "current directory" for every command after this. 
# Everything you COPY or run happens relative to here.
WORKDIR /app

# copies just package.json (and package-lock.json if you have one) 
# into the container first, before the rest of your code.
COPY package*.json ./

# installs your dependencies (Express) inside the container.
RUN npm install 
# Why copy package.json and install before copying the rest of the code? 
# This is a Docker caching trick: Docker only re-runs npm install if package.json actually changed.
# If you only edit server.js, Docker reuses the cached npm install step instead of redoing it — 
# much faster rebuilds while you're iterating.

# now copies everything else (your server.js and any other files) into
COPY . .

# documents that the container listens on port 8080. 
# This is informational (doesn't actually do the port mapping 
# — that happens in docker run), but good practice.
EXPOSE 3000

# the command that runs when the container starts: node server.js
CMD ["node", "server.js"]