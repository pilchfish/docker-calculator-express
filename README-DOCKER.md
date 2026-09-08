what is the best way to stop the docker container now its running
Since you ran it in the foreground (docker run -p 8080:8080 calculator-api without -d), the simplest way is:
Ctrl+C in the terminal where it's running — that sends an interrupt signal and stops the container.
If you want to run it in the background next time (so it doesn't tie up your terminal), you'd use the -d flag (detached mode):
bash
docker run -d -p 8080:8080 calculator-api
In that case, Ctrl+C won't do anything (there's no foreground process to interrupt) — instead you'd stop it with:
bash
docker ps                    # find the container ID or name
docker stop <container-id>   # stop it gracefully
docker stop sends a shutdown signal and gives the container a few seconds to exit cleanly before force-killing it, so it's the right command whether it was started with -d or is running detached for any other reason.
A couple of related commands worth knowing:
docker ps — shows running containers
docker ps


