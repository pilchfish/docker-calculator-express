Good, noted for later. Let's set up `logs-db` — this is genuinely the most interesting piece left, since it's the one service that actually needs to *keep* data, and Kubernetes handles that differently from a simple Deployment.

**Why Postgres can't just be a plain Deployment like the others**

A moment worth remembering from your Docker volume work: without persistent storage, if the Pod gets destroyed and recreated (which Kubernetes does routinely — updates, node restarts, rescheduling), all your log data would vanish with it. We need the Kubernetes equivalent of that named Docker volume.

**Step 1: A PersistentVolumeClaim — Kubernetes's request for durable storage**

```yaml
# k8s/logs-db/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: logs-db-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

- **`accessModes: ReadWriteOnce`** — means this storage can be mounted by one Pod at a time, read-write. That's exactly right for a single Postgres instance (you don't want two Postgres processes writing to the same data files simultaneously anyway).
- **`storage: 1Gi`** — you're asking for 1 gigabyte. k3d will fulfill this using its own default storage mechanism under the hood (conceptually similar to how it handles everything else — Docker volumes, just wrapped in Kubernetes's abstraction).

**Step 2: Postgres's Deployment, mounting that claim**

```yaml
# k8s/logs-db/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logs-db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logs-db
  template:
    metadata:
      labels:
        app: logs-db
    spec:
      containers:
        - name: logs-db
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              value: "calc_logs"
            - name: POSTGRES_PASSWORD
              value: "some-password"
            - name: POSTGRES_DB
              value: "calc_logs"
          volumeMounts:
            - name: logs-db-storage
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: logs-db-storage
          persistentVolumeClaim:
            claimName: logs-db-pvc
```

**Notice the two-step dance**: `volumeMounts` (inside the container spec) says "mount something at this path *inside the container*"; `volumes` (at the Pod level) says "and here's *what* to mount, referencing the PVC by name." This mirrors the two-part shape you already know from Docker Compose's `volumes:` section, just split into two explicit sections here rather than one line.

**Step 3: A Service, so other Pods can reach it by name**

```yaml
# k8s/logs-db/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: logs-db
spec:
  selector:
    app: logs-db
  ports:
    - port: 5432
      targetPort: 5432
```

Since your `shared/db.js` already connects via `host: 'logs-db'`, this Service name lines up perfectly — again, zero code changes needed.

**One important thing missing from this first pass, worth flagging honestly: no init script yet**

Your Compose setup automatically creates the `request_logs` table via a mounted `init.sql`. Kubernetes doesn't have that exact same convention — we'd need a `ConfigMap` holding the SQL, mounted into `/docker-entrypoint-initdb.d/` inside the Pod, to get equivalent behavior. Let's get the database itself running and confirmed persistent first, then tackle the schema-creation piece as its own clear step — want to go step by step here too?


```
Events:
  Type     Reason            Age    From               Message
  ----     ------            ----   ----               -------
  Warning  FailedScheduling  5m15s  default-scheduler  0/1 nodes are available: persistentvolumeclaim "logs-db-pvc" not found. not found
  Normal   Scheduled         5m7s   default-scheduler  Successfully assigned default/logs-db-75649c9947-nmlrm to k3d-calc-cluster-server-0
  Normal   Pulling           5m7s   kubelet            Pulling image "postgres:16-alpine"
  Normal   Pulled            51s    kubelet            Successfully pulled image "postgres:16-alpine" in 4m16.162s (4m16.162s including waiting). Image size: 116084812 bytes.
  Normal   Created           51s    kubelet            Container created
  Normal   Started           51s    kubelet            Container started
```







Good, worth noticing: it actually recovered and started on its own — the `FailedScheduling` at the top is a snapshot from *before* the PVC existed, and later events show it got `Scheduled`, `Pulled`, `Created`, `Started` successfully. So this is most likely just event history from an earlier moment, not a current failure.

**Confirm it's genuinely healthy right now**

```bash
kubectl get pods
kubectl get pvc
```

For `get pvc`, you want to see `logs-db-pvc` with `STATUS: Bound` — meaning the claim was successfully matched to actual storage. If it says `Pending` instead, that's a real problem worth digging into; if `Bound`, you're in good shape.

**A likely explanation for the initial `FailedScheduling`**: if you applied `pvc.yaml` and `deployment.yaml` in the same `kubectl apply -f k8s/logs-db/` command, Kubernetes doesn't guarantee file processing order within one folder — it's entirely plausible the Deployment got processed a moment before the PVC finished being created, causing that first failed scheduling attempt, followed by Kubernetes automatically retrying once the PVC existed. This kind of "eventually consistent, self-healing" retry behavior is actually one of Kubernetes's core selling points over Compose — worth pointing out as a small, concrete example of the self-healing concept from our very first conceptual conversation.

**Now let's actually verify persistence works, the same way you proved it out with Docker volumes**

```bash
kubectl exec -it $(kubectl get pod -l app=logs-db -o jsonpath='{.items[0].metadata.name}') -- psql -U calc_logs -d calc_logs
```

That `$(...)` piece is a genuinely new, slightly ugly-looking trick worth explaining: since Kubernetes gives Pods long, randomly-suffixed names (like `logs-db-75649c9947-nmlrm`) rather than the fixed name you set in Compose, `kubectl get pod -l app=logs-db -o jsonpath='{.items[0].metadata.name}'` is a way of asking "find me the actual current name of whichever Pod has this label" and substituting it straight into the `exec` command, so you don't have to copy-paste the random suffix by hand every time.

Once you're in `psql`, manually create the test table (since we haven't set up the init-script equivalent yet):
```sql
CREATE TABLE request_logs (id SERIAL PRIMARY KEY, note TEXT);
INSERT INTO request_logs (note) VALUES ('surviving a pod restart');
```

Then, to actually test persistence:
```bash
kubectl delete pod -l app=logs-db
```
This deletes the Pod directly — the Deployment will notice and automatically create a fresh replacement Pod (self-healing in action again). Once the new one's up:
```bash
kubectl exec -it $(kubectl get pod -l app=logs-db -o jsonpath='{.items[0].metadata.name}') -- psql -U calc_logs -d calc_logs -c "SELECT * FROM request_logs;"
```

If your row is still there after the Pod was destroyed and replaced, that's genuine proof the PVC is doing its job — exactly mirroring the `docker compose down`/`up` persistence test you did earlier, just with Kubernetes's own destroy/recreate mechanism this time.






```
❯ kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
add-service-74f744f5d7-z97jt        1/1     Running   0          5h51m
divide-service-6867f4ddbf-ww449     1/1     Running   0          5h51m
gateway-d88656c76-ccblx             1/1     Running   0          5h51m
logs-db-75649c9947-nmlrm            1/1     Running   0          9m8s
multiply-service-577899b75c-75cxp   1/1     Running   0          5h51m
nginx-proxy-7cd6fd4958-k8jcx        1/1     Running   0          5h51m
subtract-service-5864d9fdbd-2mmrt   1/1     Running   0          5h51m
❯ kubectl get pvc
NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
logs-db-pvc   Bound    pvc-e9a92c0a-fd26-4ba3-9a55-1103fd0c1f37   1Gi        RWO            local-path     <unset>                 9m22s


❯ kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
add-service-74f744f5d7-z97jt        1/1     Running   0          5h51m
divide-service-6867f4ddbf-ww449     1/1     Running   0          5h51m
gateway-d88656c76-ccblx             1/1     Running   0          5h51m
logs-db-75649c9947-nmlrm            1/1     Running   0          9m8s
multiply-service-577899b75c-75cxp   1/1     Running   0          5h51m
nginx-proxy-7cd6fd4958-k8jcx        1/1     Running   0          5h51m
subtract-service-5864d9fdbd-2mmrt   1/1     Running   0          5h51m
❯ kubectl get pvc
NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
logs-db-pvc   Bound    pvc-e9a92c0a-fd26-4ba3-9a55-1103fd0c1f37   1Gi        RWO            local-path     <unset>                 9m22s
❯ kubectl exec -it $(kubectl get pod -l app=logs-db -o jsonpath='{.items[0].metadata.name}') -- psql -U calc_logs -d calc_logs
psql (16.15)
Type "help" for help.

calc_logs=# CREATE TABLE request_logs (id SERIAL PRIMARY KEY, note TEXT);
CREATE TABLE
calc_logs=# display tables
calc_logs-# show tables
calc_logs-# \c database_name
connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  database "database_name" does not exist
Previous connection kept
calc_logs-# database_name
calc_logs-# dt
calc_logs-# INSERT INTO request_logs (note) VALUES ('surviving a pod restart');
ERROR:  syntax error at or near "display"
LINE 1: display tables
        ^
calc_logs=# INSERT INTO request_logs (note) VALUES ('surviving a pod restart');
INSERT 0 1
calc_logs=# select * from request_logs
calc_logs-# exit
Use \q to quit.
calc_logs-# \q
❯ kubectl exec -it $(kubectl get pod -l app=logs-db -o jsonpath='{.items[0].metadata.name}') -- psql -U calc_logs -d calc_logs -c "SELECT * FROM request_logs;"
 id |          note           
----+-------------------------
  1 | surviving a pod restart
(1 row)

❯ kubectl delete pod -l app=logs-db
pod "logs-db-75649c9947-nmlrm" deleted
❯ kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
add-service-74f744f5d7-z97jt        1/1     Running   0          6h1m
divide-service-6867f4ddbf-ww449     1/1     Running   0          6h1m
gateway-d88656c76-ccblx             1/1     Running   0          6h1m
logs-db-75649c9947-6vl2h            1/1     Running   0          6s
multiply-service-577899b75c-75cxp   1/1     Running   0          6h1m
nginx-proxy-7cd6fd4958-k8jcx        1/1     Running   0          6h1m
subtract-service-5864d9fdbd-2mmrt   1/1     Running   0          6h1m
❯ kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
add-service-74f744f5d7-z97jt        1/1     Running   0          6h1m
divide-service-6867f4ddbf-ww449     1/1     Running   0          6h1m
gateway-d88656c76-ccblx             1/1     Running   0          6h1m
logs-db-75649c9947-6vl2h            1/1     Running   0          10s
multiply-service-577899b75c-75cxp   1/1     Running   0          6h1m
nginx-proxy-7cd6fd4958-k8jcx        1/1     Running   0          6h1m
subtract-service-5864d9fdbd-2mmrt   1/1     Running   0          6h1m
❯ kubectl describe pod -l app=logs-db
Name:             logs-db-75649c9947-6vl2h
Namespace:        default
Priority:         0
Service Account:  default
Node:             k3d-calc-cluster-server-0/172.18.0.3
Start Time:       Mon, 28 Sep 2026 21:35:02 +0100
Labels:           app=logs-db
                  pod-template-hash=75649c9947
Annotations:      <none>
Status:           Running
IP:               10.42.0.40
IPs:
  IP:           10.42.0.40
Controlled By:  ReplicaSet/logs-db-75649c9947
Containers:
  logs-db:
    Container ID:   containerd://5696c7af5eecb899a6d9f6b27cc3371d1c10d3720499c07a2824137c7e89777f
    Image:          postgres:16-alpine
    Image ID:       docker.io/library/postgres@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea
    Port:           5432/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Mon, 28 Sep 2026 21:35:03 +0100
    Ready:          True
    Restart Count:  0
    Environment:
      POSTGRES_USER:      calc_logs
      POSTGRES_PASSWORD:  some-password
      POSTGRES_DB:        calc_logs
    Mounts:
      /var/lib/postgresql/data from logs-db-storage (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-68xsh (ro)
Conditions:
  Type                        Status
  PodReadyToStartContainers   True 
  Initialized                 True 
  Ready                       True 
  ContainersReady             True 
  PodScheduled                True 
Volumes:
  logs-db-storage:
    Type:       PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)
    ClaimName:  logs-db-pvc
    ReadOnly:   false
  kube-api-access-68xsh:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    Optional:                false
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  16s   default-scheduler  Successfully assigned default/logs-db-75649c9947-6vl2h to k3d-calc-cluster-server-0
  Normal  Pulled     16s   kubelet            Container image "postgres:16-alpine" already present on machine and can be accessed by the pod
  Normal  Created    16s   kubelet            Container created
  Normal  Started    16s   kubelet            Container started
❯ kubectl exec -it $(kubectl get pod -l app=logs-db -o jsonpath='{.items[0].metadata.name}') -- psql -U calc_logs -d calc_logs -c "SELECT * FROM request_logs;"
 id |          note           
----+-------------------------
  1 | surviving a pod restart
(1 row)

```




# init.config to create database
Good, let's set that up — this is the Kubernetes equivalent of your Compose `init.sql` mount, just using a **ConfigMap** as the mechanism instead of a plain file path.

**Step 1: Create a ConfigMap holding your SQL**

```yaml
# k8s/logs-db/init-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logs-db-init
data:
  init.sql: |
    CREATE TABLE IF NOT EXISTS request_logs (
      id SERIAL PRIMARY KEY,
      service_name TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      forwarded_for TEXT,
      forwarded_host TEXT,
      forwarded_proto TEXT,
      status_code INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
```

**What's happening here, since this is a new resource type**

A ConfigMap is genuinely just a named bundle of key-value data that Kubernetes stores and makes available to Pods — here, the key is `init.sql` and the value is your entire SQL script, stored as a multi-line string (the `|` character tells YAML "everything indented below this is literal text, preserve the line breaks"). Unlike a Docker bind-mount (which points at a real file sitting on your host machine), a ConfigMap's content lives *inside Kubernetes itself* — this is actually a meaningful difference worth sitting with: your SQL is no longer "a file on disk that happens to get mounted," it's now a piece of cluster configuration in its own right, versioned and managed the same way as everything else you `kubectl apply`.

**Step 2: Mount the ConfigMap into the Postgres Pod, at the same path Postgres already looks for init scripts**

```yaml
# k8s/logs-db/deployment.yaml (updated)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logs-db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logs-db
  template:
    metadata:
      labels:
        app: logs-db
    spec:
      containers:
        - name: logs-db
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              value: "calc_logs"
            - name: POSTGRES_PASSWORD
              value: "some-password"
            - name: POSTGRES_DB
              value: "calc_logs"
          volumeMounts:
            - name: logs-db-storage
              mountPath: /var/lib/postgresql/data
            - name: logs-db-init
              mountPath: /docker-entrypoint-initdb.d
      volumes:
        - name: logs-db-storage
          persistentVolumeClaim:
            claimName: logs-db-pvc
        - name: logs-db-init
          configMap:
            name: logs-db-init
```

**What's new here, compared to the PVC mount you already did**

Same two-part pattern (`volumeMounts` inside the container, `volumes` at the Pod level) — except this time the `volumes` entry says `configMap: name: logs-db-init` instead of `persistentVolumeClaim`. Kubernetes automatically turns each key in the ConfigMap's `data` into an actual file inside the mounted directory — so `init.sql` (the key) becomes a real file at `/docker-entrypoint-initdb.d/init.sql` inside the container, exactly matching the convention Postgres's own image already looks for, same as your Compose setup.

**Important — since you already have data in your PVC from earlier testing, this won't run again on its own**

Just like Compose, Postgres only runs `initdb.d` scripts against a genuinely fresh, empty data directory. Since your `logs-db-pvc` already has data (including the manual test table you created), applying this ConfigMap now won't trigger anything by itself — worth testing properly by wiping the PVC and starting fresh:

```bash
kubectl apply -f k8s/logs-db/
kubectl delete deployment logs-db
kubectl delete pvc logs-db-pvc
kubectl apply -f k8s/logs-db/
```

Deleting the PVC (not just the Deployment) is the key step — that's what actually clears the underlying storage, forcing a genuinely fresh volume next time the Pod starts.

**Confirm it worked**

```bash
kubectl logs -l app=logs-db
```
Look for Postgres's own log line mentioning it ran your `init.sql`, same wording as you saw in Compose's logs. Then:
```bash
kubectl exec -it $(kubectl get pod -l app=logs-db -o jsonpath='{.items[0].metadata.name}') -- psql -U calc_logs -d calc_logs -c "\dt"
```
`request_logs` should be listed — created automatically this time, no manual `psql` step needed.

Give that a try and let me know what the logs show.











Good, let's set that up — this is the Kubernetes equivalent of your Compose `init.sql` mount, just using a **ConfigMap** as the mechanism instead of a plain file path.

**Step 1: Create a ConfigMap holding your SQL**

```yaml
# k8s/logs-db/init-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logs-db-init
data:
  init.sql: |
    CREATE TABLE IF NOT EXISTS request_logs (
      id SERIAL PRIMARY KEY,
      service_name TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      forwarded_for TEXT,
      forwarded_host TEXT,
      forwarded_proto TEXT,
      status_code INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
```

**What's happening here, since this is a new resource type**

A ConfigMap is genuinely just a named bundle of key-value data that Kubernetes stores and makes available to Pods — here, the key is `init.sql` and the value is your entire SQL script, stored as a multi-line string (the `|` character tells YAML "everything indented below this is literal text, preserve the line breaks"). Unlike a Docker bind-mount (which points at a real file sitting on your host machine), a ConfigMap's content lives *inside Kubernetes itself* — this is actually a meaningful difference worth sitting with: your SQL is no longer "a file on disk that happens to get mounted," it's now a piece of cluster configuration in its own right, versioned and managed the same way as everything else you `kubectl apply`.

**Step 2: Mount the ConfigMap into the Postgres Pod, at the same path Postgres already looks for init scripts**

```yaml
# k8s/logs-db/deployment.yaml (updated)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logs-db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logs-db
  template:
    metadata:
      labels:
        app: logs-db
    spec:
      containers:
        - name: logs-db
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              value: "calc_logs"
            - name: POSTGRES_PASSWORD
              value: "some-password"
            - name: POSTGRES_DB
              value: "calc_logs"
          volumeMounts:
            - name: logs-db-storage
              mountPath: /var/lib/postgresql/data
            - name: logs-db-init
              mountPath: /docker-entrypoint-initdb.d
      volumes:
        - name: logs-db-storage
          persistentVolumeClaim:
            claimName: logs-db-pvc
        - name: logs-db-init
          configMap:
            name: logs-db-init
```

**What's new here, compared to the PVC mount you already did**

Same two-part pattern (`volumeMounts` inside the container, `volumes` at the Pod level) — except this time the `volumes` entry says `configMap: name: logs-db-init` instead of `persistentVolumeClaim`. Kubernetes automatically turns each key in the ConfigMap's `data` into an actual file inside the mounted directory — so `init.sql` (the key) becomes a real file at `/docker-entrypoint-initdb.d/init.sql` inside the container, exactly matching the convention Postgres's own image already looks for, same as your Compose setup.

**Important — since you already have data in your PVC from earlier testing, this won't run again on its own**

Just like Compose, Postgres only runs `initdb.d` scripts against a genuinely fresh, empty data directory. Since your `logs-db-pvc` already has data (including the manual test table you created), applying this ConfigMap now won't trigger anything by itself — worth testing properly by wiping the PVC and starting fresh:

```bash
kubectl apply -f k8s/logs-db/
kubectl delete deployment logs-db
kubectl delete pvc logs-db-pvc
kubectl apply -f k8s/logs-db/
```

Deleting the PVC (not just the Deployment) is the key step — that's what actually clears the underlying storage, forcing a genuinely fresh volume next time the Pod starts.

**Confirm it worked**

```bash
kubectl logs -l app=logs-db
```
Look for Postgres's own log line mentioning it ran your `init.sql`, same wording as you saw in Compose's logs. Then:
```bash
kubectl exec -it $(kubectl get pod -l app=logs-db -o jsonpath='{.items[0].metadata.name}') -- psql -U calc_logs -d calc_logs -c "\dt"
```
`request_logs` should be listed — created automatically this time, no manual `psql` step needed.

Give that a try and let me know what the logs show.