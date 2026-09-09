Good alternative to know — useful for quick tests without going through GitHub each time. The standard tool for this is `scp` (secure copy), which comes built into macOS and works over your existing SSH connection.

**Copying a whole folder from Mac to Pi:**
```bash
scp -r ~/path/to/calculator-project pi-username@192.168.0.81:~/
```
- `-r` — recursive, needed for copying a folder (not just a single file)
- `pi-username@192.168.0.81` — replace `pi-username` with whatever user you SSH in as, and `192.168.0.81` is your Pi's IP from earlier
- `~/` at the end — destination on the Pi, here meaning "their home directory"; the whole folder gets copied in as a subfolder there

**Copying just one file:**
```bash
scp ~/path/to/server.js pi-username@192.168.0.81:~/calculator-project/
```

**Things worth knowing:**

- **It'll ask for your Pi user's password** (same as when you SSH in), unless you've set up SSH key-based login, in which case it just works without a prompt.
- **`node_modules` will slow this down a lot if included** — since `scp -r` copies everything in the folder indiscriminately (no `.gitignore`-style filtering), you'd want to either delete `node_modules` locally before copying, or exclude it. `scp` itself doesn't support exclude patterns natively — for that, `rsync` (below) is a better tool.

**A better alternative for repeated syncing: `rsync`**
```bash
rsync -avz --exclude 'node_modules' ~/path/to/calculator-project/ pi-username@192.168.0.81:~/calculator-project/
```
- `-a` — archive mode (preserves permissions, timestamps, etc.)
- `-v` — verbose, shows what's being copied
- `-z` — compresses during transfer, faster over Wi-Fi
- `--exclude 'node_modules'` — skips that folder, exactly the exclusion `scp` can't do natively
- Run this same command again after making changes, and `rsync` only copies what's *changed*, rather than re-sending everything — much faster for iterating

**Which to use**: for a one-off "just get it over there" copy, `scp -r` is simpler and totally fine. If you find yourself repeatedly updating code and re-copying while testing, `rsync` will save you real time and bandwidth once you're comfortable with the extra flags.

Note that either way, you'd still run `docker build` (or `docker compose up --build`) *on the Pi itself* after copying — copying the files over doesn't build anything, it just gets the source code where it needs to be, same role that `git clone` was playing before.







What you're describing is called **remote development**, and it's a really solid workflow once your project has multiple files/services like you're about to build — instead of copying files back and forth, your IDE connects directly to the Pi and edits the files that live there.

**VS Code Remote - SSH (the most common way to do this)**

This is the standard approach:

1. Install **VS Code** on your Mac if you don't already have it.
2. Install the **"Remote - SSH"** extension (by Microsoft) from the Extensions panel.
3. Click the small green icon in the bottom-left corner of VS Code (or `Cmd+Shift+P` → "Remote-SSH: Connect to Host").
4. Enter `pi-username@192.168.0.81` (your Pi's SSH address).
5. VS Code installs a small "server" component on the Pi automatically the first time, then opens a new window that's actually running *against the Pi's filesystem* — even though you're looking at it on your Mac's screen.

Once connected, everything feels local — you open a folder (e.g. `~/calculator-microservices`), edit files, and use VS Code's integrated terminal, but every file read/write and every terminal command genuinely happens on the Pi. No syncing step needed at all, because there's only one copy of the files, sitting on the Pi.

**Why this is a nice fit for what you're doing next**

- No more `scp`/`rsync`/`git push`+`git pull` round-trips just to test a change — you edit, save, and immediately run `docker compose up --build` in the same VS Code terminal, already on the Pi.
- You still get full IDE features — syntax highlighting, autocomplete, file tree — despite the code never actually touching your Mac's disk.
- Multiple terminals in the same window means you could have one running `docker compose logs -f` while you edit in another pane.

**A genuine trade-off to know about**

Your Pi 4 does the "thinking" for some of this (the VS Code server component runs on the Pi, using a bit of its RAM/CPU) — on a Pi 4 this is generally fine, but it's worth knowing this wouldn't have worked at all on the Zero boards we discussed earlier, since they don't have the resources to run the remote server component comfortably.

**Where Git still fits in**

Even with remote editing, Git remains valuable — you'd still want to commit and push from the Pi's terminal (inside your VS Code remote session) periodically, so you have version history and a backup off the Pi itself, not because you need it to *transfer* files anymore.

Do you already have VS Code installed, or is this a new tool for you too?