Good question to ask now, actually — it's relevant to what we're about to do, since MetalLB is very often installed *via* Helm in real-world setups, so it's worth understanding before we get there.

**What Helm actually is**

Helm is often described as "the package manager for Kubernetes" — and that comparison is genuinely apt if you think about `brew install <something>` or `npm install <package>`. Instead of writing every single YAML manifest by hand for a piece of software you want to run, Helm lets you install a pre-packaged, configurable bundle with one command.

**What a Helm chart actually is**

A **chart** is the package itself — a bundled collection of Kubernetes YAML templates (Deployments, Services, ConfigMaps, PVCs, all the resource types you already know), plus a set of default configuration values, all built by whoever maintains that piece of software. Installing a chart runs those templates through Helm's own templating engine (conceptually similar to what `envsubst` or Kustomize does — substituting values into placeholders), then applies the result to your cluster, exactly like a `kubectl apply` would, just automated and parameterized.

**A concrete example, directly relevant to today**

MetalLB itself ships an official Helm chart. Instead of hand-writing MetalLB's (fairly involved) manifests yourself, you'd do:
```bash
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb
```
Two commands, and MetalLB's entire set of Deployments, Services, ConfigMaps, RBAC rules, etc. gets created for you, correctly wired together — the way the MetalLB maintainers intend it to be run.

**Could you use it in this project? Genuinely yes, in two different ways**

1. **As a consumer** — installing other people's software (MetalLB, an Ingress controller, Postgres itself even) via their published charts, rather than hand-writing manifests for things you didn't build. This is overwhelmingly the most common way Helm gets used in practice.
2. **As an author** — packaging your *own* calculator stack (the four services, gateway, proxy, logs-db) as your own Helm chart, so instead of `kubectl apply -f k8s/` (or `-k` for the Kustomize parts), you'd have one `helm install calculator ./my-chart` command, with your Mac-vs-Pi tag differences handled via Helm's own values-override mechanism instead of (or alongside) Kustomize.

**How this compares to Kustomize, which you already know**

They solve genuinely overlapping problems, worth being honest about: Kustomize is for "take existing plain YAML and patch/override parts of it" (what you just did with the nginx-proxy tag) — it doesn't package or template deeply, just layers changes on top of concrete files. Helm is a fuller templating and packaging system, more like a proper installer, with versioning, rollback (`helm rollback`), and a much richer templating language. Many real projects actually use *both* — Helm for installing third-party infrastructure (like MetalLB), Kustomize for their own app-specific overlays (like you just did).

**My suggestion for right now**

Use Helm today specifically to install **MetalLB** (since that's the practical, standard way people actually install it — the official docs themselves recommend Helm as one of the primary methods), and hold off on converting your *own* calculator manifests into a Helm chart — that's a genuinely worthwhile exercise, but a separate one, better done once MetalLB/Ingress is sorted and not competing for attention with a brand-new templating system on top of everything else today.

Want to start by installing Helm itself, then use it to bring in MetalLB?





Good — once Helm's installed, here's the sequence. One important k3s-specific wrinkle to flag before we start: **k3s ships with its own built-in load balancer already**, called ServiceLB (historically "Klipper"), which is why `k3d cluster list` showed `LOADBALANCER: true` earlier. If MetalLB and ServiceLB both try to manage the same thing, they can conflict — so we need to disable k3s's built-in one first.

**1. Confirm Helm installed correctly**
```bash
helm version
```

**2. Disable k3s's built-in ServiceLB, since MetalLB will replace it**

This needs to happen on the Pi itself, by editing how the k3s service starts:
```bash
sudo systemctl edit k3s
```
Add:
```
[Service]
ExecStart=
ExecStart=/usr/local/bin/k3s server --disable servicelb
```
(The blank `ExecStart=` first is required — it clears the original command so your new one fully replaces it, rather than appending.)

Then:
```bash
sudo systemctl restart k3s
```

**3. Add MetalLB's Helm repository and install it**

From your Mac, pointed at the Pi's cluster:
```bash
helm repo add metallb https://metallb.github.io/metallb
helm repo update
helm install metallb metallb/metallb --kubeconfig ~/k3s-pi.yaml -n metallb-system --create-namespace
```

**A new concept here worth flagging: `-n metallb-system --create-namespace`**

This is the first time you've used a **namespace** — Kubernetes's way of grouping related resources into a separate logical area within the same cluster, so MetalLB's own Pods/Services don't mix in with your calculator project's resources (which have all been sitting in the default namespace this whole time, without you needing to think about it). Worth knowing this exists now; not something to dive deep into today.

**4. Confirm MetalLB's own Pods came up correctly**
```bash
kubectl --kubeconfig ~/k3s-pi.yaml get pods -n metallb-system
```

**5. Tell MetalLB what IP range it's allowed to hand out**

This is the genuinely important configuration step — MetalLB needs to know which IPs on your home network it's allowed to claim as "external" addresses. Pick a small range within your `192.168.0.x` network that your router definitely isn't handing out via DHCP (worth checking your router's DHCP settings to confirm this range is safe/reserved):

```yaml
# metallb-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: pi-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.0.240-192.168.0.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: pi-l2adv
  namespace: metallb-system
spec:
  ipAddressPools:
    - pi-pool
```
```bash
kubectl --kubeconfig ~/k3s-pi.yaml apply -f metallb-config.yaml
```

Run through steps 1–4 first and paste what `get pods -n metallb-system` shows — want to confirm MetalLB itself is healthy before we configure the actual IP pool and change your `nginx-proxy` Service to type `LoadBalancer`.




# question wha tis meant by... From your Mac, pointed at the Pi's cluster:

Good to double-check rather than assume — let me be precise about it.

**What I mean**: you don't need to SSH into the Pi to run the `helm install` command. You can run it directly in a terminal on your Mac, exactly the way you've been running `kubectl --kubeconfig ~/k3s-pi.yaml ...` commands all session — Helm works the same way `kubectl` does, talking to the cluster remotely over the network rather than needing to run locally on the machine hosting it.

**Concretely, this command:**
```bash
helm install metallb metallb/metallb --kubeconfig ~/k3s-pi.yaml -n metallb-system --create-namespace
```
...is meant to be typed into your Mac's regular terminal — the same terminal window/session where you've already been running things like:
```bash
kubectl --kubeconfig ~/k3s-pi.yaml get pods
```

**Why this works**

Helm doesn't have its own separate concept of "which cluster" — under the hood, it actually just reads the same kubeconfig mechanism `kubectl` uses to figure out which cluster to talk to, and sends its own requests to that cluster's Kubernetes API over the network. That's why passing `--kubeconfig ~/k3s-pi.yaml` to `helm` (the same file you already set up earlier) is enough to point it at the Pi's cluster specifically, rather than any other cluster you might have configured (like your k3d one).

**Contrast with step 2 (disabling ServiceLB)** — that one genuinely does need to run *on* the Pi itself, via SSH, since `systemctl edit k3s` is modifying the Pi's own local system service configuration — a machine-level change, not a cluster-API-level one. That's the same distinction from earlier today: `kubectl`/`helm` talk to the cluster's API remotely; anything about the actual machine itself (`systemctl`, `crictl`, `k3s ctr`) needs you to be logged into that specific machine.

So to summarize which commands go where:
- **On your Mac**: `helm install ...`, `kubectl --kubeconfig ~/k3s-pi.yaml ...`
- **On the Pi (via SSH)**: `sudo systemctl edit k3s`, `sudo systemctl restart k3s`

Does that clear up which terminal each command belongs in?






```bash
kubectl --kubeconfig ~/k3s-pi.yaml get pods -n metallb-system
NAME                                             READY   STATUS    RESTARTS      AGE
metallb-controller-bc9cbb54b-gxhh4               1/1     Running   1 (41m ago)   7d22h
metallb-frr-k8s-g29l9                            5/5     Running   5 (41m ago)   7d22h
metallb-frr-k8s-statuscleaner-75b695f48d-q6ddz   1/1     Running   2 (41m ago)   7d22h
metallb-speaker-ftqxj                            1/1     Running   1 (41m ago)   7d22h
```


All four MetalLB Pods `Running` — controller, the FRR speaker set, the status cleaner, and the speaker itself. MetalLB is healthy and ready to be configured.

**Next: tell MetalLB which IPs it's allowed to hand out**

Before applying this, double check your router's DHCP range (usually in its admin page, same `192.168.0.1` you've used before) so the range below genuinely sits *outside* what your router hands out automatically — otherwise you risk two devices fighting over the same address.

```yaml
# metallb-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: pi-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.0.240-192.168.0.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: pi-l2adv
  namespace: metallb-system
spec:
  ipAddressPools:
    - pi-pool
```

- **`IPAddressPool`** — the actual range MetalLB is allowed to assign from.
- **`L2Advertisement`** — tells MetalLB *how* to make those IPs reachable on your network. "L2" means Layer 2 (ARP) — MetalLB answers "who has this IP?" on your local network directly, which is the simplest mode and the right one for a home network like yours (the alternative, BGP mode, is for proper routed networks with real routers that speak BGP — not relevant here).

**Apply it:**
```bash
kubectl --kubeconfig ~/k3s-pi.yaml apply -f metallb-config.yaml
```

**Now, the actual payoff — change `nginx-proxy`'s Service from `ClusterIP` (the implicit default you've been using) to `LoadBalancer`:**

```yaml
# k8s/nginx-proxy/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-proxy
spec:
  type: LoadBalancer
  selector:
    app: nginx-proxy
  ports:
    - port: 80
      targetPort: 80
```

```bash
kubectl --kubeconfig ~/k3s-pi.yaml apply -f k8s/nginx-proxy/base/service.yaml
```

**Check what IP MetalLB assigned:**
```bash
kubectl --kubeconfig ~/k3s-pi.yaml get service nginx-proxy
```
Look at the `EXTERNAL-IP` column — it should show a real address from your `240-250` range, no longer `<pending>`.

**Test it — no `port-forward`, no open terminal required this time:**
```bash
curl -H "X-API-Key: your-secret-key-here" "http://192.168.0.24X/add?a=5&b=3"
```

If that works, you've got permanent, always-on external access to the cluster — genuinely closing out the last piece of friction from today's whole Kubernetes journey. Give it a try and paste what `EXTERNAL-IP` shows.