Good question — Kubernetes's answer here is a bit less convenient out of the box than Compose's `docker compose logs -f`, worth knowing both the built-in limitation and the ways around it.

**The built-in `kubectl` way: genuinely one at a time by default**

```bash
kubectl logs -l app=add-service
```
Labels (`-l app=add-service`) let you select by label rather than typing the exact random Pod name, which is convenient — but this only shows logs from Pods matching *that one label*. There's no single built-in `kubectl` command that tails every Pod across every one of your services simultaneously, interleaved, the way `docker compose logs -f` did.

**Following logs live, still one selector at a time**
```bash
kubectl logs -l app=add-service -f
```
Same `-f` follow flag you already know from Docker.

**A genuine multi-pod trick, if the Pods you want share enough in common**

If you happen to have a label that spans multiple services (you don't currently, but *could* add one — e.g., labeling every Pod with `project: calculator` alongside its `app: add-service` label), you could do:
```bash
kubectl logs -l project=calculator -f
```
This is worth knowing as a technique, but it requires you to have planned for it via labeling — not something that "just works" after the fact.

**The realistic, commonly-used answer: a third-party tool called `stern`**

This is genuinely the standard solution people reach for in real Kubernetes work, since `kubectl` itself doesn't offer this natively:
```bash
brew install stern
stern .
```
`stern .` (a Go regex matching "everything") tails logs from **all** Pods in your current namespace simultaneously, color-coded by Pod name, updating live — essentially exactly the `docker compose logs -f` experience you're used to. You can also scope it: `stern add-service` matches just Pods with that name pattern, similar to `-l app=add-service` but with nicer live-tailing and multi-pod output.

**My suggestion**: `stern` is a quick `brew install`, widely used, and gets you back the exact workflow you already know and like from Compose — worth adding to your toolkit now, since you'll likely want this constantly once you have five-plus Pods running and something misbehaves across the stack.