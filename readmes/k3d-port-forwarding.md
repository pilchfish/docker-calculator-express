Good question, and it gets at a real limitation of what you've been using versus how this actually works in a genuine cloud deployment.

**Why `port-forward` is temporary, by design**

`kubectl port-forward` isn't meant to be a permanent way of exposing something — it's explicitly a **debugging/development tool**. It only exists for as long as that specific `kubectl` command keeps running in your terminal; close the terminal, hit Ctrl+C, or lose your connection, and the tunnel is gone. It was never designed to be "the way people reach your app," just "a quick way for *you*, right now, to peek in from your own machine."

**Why it's needed at all in your local k3d setup**

Your k3d cluster is running *inside Docker containers on your Mac*, genuinely isolated from your Mac's own network — remember, this is the same isolation boundary that caused the image-pull problem earlier (the cluster can't see your local Docker images by default; equally, your Mac can't automatically reach into the cluster's internal network by default). `port-forward` is k3d/Kubernetes's answer to "let me open one temporary hole through that isolation, just for this session."

**How this differs in a real cloud deployment (GCP, AWS, etc.)**

In a genuine cloud cluster, you wouldn't use `port-forward` for real traffic at all — you'd use a Kubernetes resource type specifically designed to expose something **persistently and externally**:

- **`Service` type `LoadBalancer`** — instead of the default `ClusterIP` type (internal-only, which is what you've been using this whole time without perhaps realizing it was a *type*), a `LoadBalancer` Service tells the cloud provider "please provision a real, stable, external IP address for this, and keep routing traffic to it, always." GCP (or AWS, Azure) sees this request and automatically spins up their own actual cloud load balancer infrastructure behind the scenes, assigns it a public IP, and that IP just works, permanently, with no `kubectl` command needing to stay running on your laptop.
- **`Ingress`** — the concept we touched on when mapping Kubernetes vocabulary to what you know; a more sophisticated way to expose multiple services under one external IP/domain, routing by hostname or path — this is typically how a "real" production setup exposes something like your `nginx-proxy`.

**Why your local k3d cluster can't do the `LoadBalancer` trick properly**

`LoadBalancer` only becomes a *real, working* external IP when there's an actual cloud provider underneath, integrated with Kubernetes, ready to provision real infrastructure in response to that request. Since k3d is just running inside Docker on your own Mac, there's no cloud provider to fulfill that request — k3d does provide a *partial* stand-in for this (it can map a `LoadBalancer` Service to a port on your Mac, similar in spirit to Compose's `ports:`), but it's not the same mechanism as what GCP would genuinely do.

**The direct comparison, side by side:**

| | Your local k3d setup | Real cloud (GCP, etc.) |
|---|---|---|
| Default `Service` type | `ClusterIP` — internal-only | Same, `ClusterIP` — internal-only |
| To expose externally | `kubectl port-forward` (temporary, manual) | `Service: type: LoadBalancer` (permanent, real IP) or `Ingress` |
| What provisions the external access | You, manually, per session | The cloud provider automatically |

So, to directly answer "why do I have to do this every time" — it's specifically a consequence of developing against a *local* cluster with no real cloud infrastructure behind it. The moment this stack moved to something like GCP (or, at a smaller scale, even the Pi running k3s with a tool like MetalLB providing a similar "fake" LoadBalancer for bare-metal), you'd set up a `LoadBalancer`/`Ingress` once, and it would simply stay reachable — no repeated manual command needed at all.