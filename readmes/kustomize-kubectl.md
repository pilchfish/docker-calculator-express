when I rebuilt the proxy I gave it a different tag, before it was :latest and now  its pilchfish/docker-nginx-proxy:arm64
in the deployment.yaml file its
spec:
  template:
    spec:
      containers:
              containers:
                image: pilchfish/docker-nginx-proxy:latest

is there a way to make this dynamic at runtime and pass in an argument to set the tag?
 image: pilchfish/docker-nginx-proxy:{{docker hub-proxy-tag}}









 Good question — and first, a quick catch: your pasted YAML has `containers:` listed twice in a row, nested inside itself, which is invalid structure (a leftover from editing, most likely). Worth fixing that regardless of the tag question — should be:
```yaml
spec:
  template:
    spec:
      containers:
        - name: nginx-proxy
          image: pilchfish/docker-nginx-proxy:latest
```

**Now, to your actual question — yes, this is a real and common need, with two standard approaches**

Plain `kubectl apply -f` on raw YAML has no built-in variable substitution — Kubernetes just reads the file literally. So `{{docker-hub-proxy-tag}}` as you've written it wouldn't work out of the box; you need one of these tools layered on top.

**Option 1: `envsubst` — the same tool you already used for the nginx config itself**

Since you've already done exactly this trick once this project (nginx's `${PROXY_TARGET}` templating), the same idea applies here:

```yaml
# deployment.yaml.template
containers:
  - name: nginx-proxy
    image: pilchfish/docker-nginx-proxy:${IMAGE_TAG}
```

```bash
export IMAGE_TAG=arm64
envsubst < deployment.yaml.template > deployment.yaml
kubectl apply -f deployment.yaml
```

Simple, and you already understand the mechanism — but it's a manual step you run yourself each time, not something Kubernetes or `kubectl` does natively.

**Option 2: Kustomize — built directly into `kubectl`, the more "proper" Kubernetes-native way**

Kustomize lets you keep a base manifest untouched, and layer *overrides* on top — genuinely similar in spirit to your Compose `docker-compose.override.yml` pattern.

```yaml
# base/deployment.yaml — the "real" file, checked into git, always says :latest
containers:
  - name: nginx-proxy
    image: pilchfish/docker-nginx-proxy:latest
```

```yaml
# overlays/pi/kustomization.yaml
resources:
  - ../../base
images:
  - name: pilchfish/docker-nginx-proxy
    newTag: arm64
```

```bash
kubectl apply -k overlays/pi/
```

`-k` (instead of `-f`) tells `kubectl` to run this through Kustomize, which reads the base file, applies the tag override, and applies the *result* — without you ever hand-editing the original file or needing a separate `envsubst` step.

**Which would I suggest?**

Given you're already comfortable with the override-file pattern from Compose, and Kustomize is genuinely built into `kubectl` (no extra install needed — try `kubectl kustomize --help` to confirm it's there), I'd lean toward **Kustomize** here — it's the standard, idiomatic Kubernetes way of handling exactly this "same manifest, different tag per environment" problem, and it'll generalize well once you have more than just the proxy's tag varying between your Mac's k3d and the Pi's k3s.

Want to set up a `base/` + `overlays/pi/` structure for just the proxy first, to see Kustomize in action before deciding whether to extend it to the rest of your manifests?







Good, let's set it up for the proxy only, and prove it works before deciding whether to extend the pattern.

**1. Restructure the proxy's manifests into a `base/` folder**

```
k8s/
└── nginx-proxy/
    ├── base/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   └── kustomization.yaml
    └── overlays/
        └── pi/
            └── kustomization.yaml
```

**2. `k8s/nginx-proxy/base/deployment.yaml`** — your existing file, fixed and untouched otherwise:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-proxy
  template:
    metadata:
      labels:
        app: nginx-proxy
    spec:
      containers:
        - name: nginx-proxy
          image: pilchfish/docker-nginx-proxy:latest
          ports:
            - containerPort: 80
          env:
            - name: PROXY_TARGET
              value: "http://gateway:8080"
```

**3. `k8s/nginx-proxy/base/service.yaml`** — unchanged from what you already have.

**4. `k8s/nginx-proxy/base/kustomization.yaml`** — a new file, this is what makes the folder "a Kustomize base":
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```
This just lists which plain manifest files belong to this base — Kustomize needs this file to know what it's working with.

**5. `k8s/nginx-proxy/overlays/pi/kustomization.yaml`** — the actual override:
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
images:
  - name: pilchfish/docker-nginx-proxy
    newTag: arm64
```
- `resources: - ../../base` — "start from that base folder"
- `images: - name: ... newTag: arm64` — "wherever the base references this image, swap the tag to `arm64`"

**6. Test it without applying anything yet — just see what Kustomize would produce:**
```bash
kubectl kustomize k8s/nginx-proxy/overlays/pi/
```
This prints the fully-resolved YAML to your terminal. Check that the `image:` line now reads `pilchfish/docker-nginx-proxy:arm64` — proof the substitution worked, before anything touches the actual cluster.

**7. Once that looks right, apply it for real (against the Pi's kubeconfig):**
```bash
kubectl --kubeconfig ~/k3s-pi.yaml apply -k k8s/nginx-proxy/overlays/pi/
```

**And for your Mac's k3d cluster, you'd just apply the base directly, untouched:**
```bash
kubectl apply -k k8s/nginx-proxy/base/
```
(or even plain `kubectl apply -f k8s/nginx-proxy/base/`, since a Kustomize base with no overlay is really just... your original manifests)

Try step 6 first — run `kubectl kustomize k8s/nginx-proxy/overlays/pi/` and paste what it outputs, so we can confirm the tag substitution before applying anything for real.




# output from command: $ kubectl kustomize k8s/nginx-proxy/overlays/pi/
``` bash
❯ kubectl kustomize k8s/nginx-proxy/overlays/pi/
apiVersion: v1
kind: Service
metadata:
  name: nginx-proxy
spec:
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: nginx-proxy
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-proxy
  template:
    metadata:
      labels:
        app: nginx-proxy
    spec:
      containers:
      - env:
        - name: PROXY_TARGET
          value: http://gateway:8080
        image: pilchfish/docker-nginx-proxy:arm64
        imagePullPolicy: IfNotPresent
        name: nginx-proxy
        ports:
        - containerPort: 80
        ```


