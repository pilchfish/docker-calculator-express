Good, let's build this layer by layer, since each hop needs to do something slightly different: capture the original values once, then just pass them along unchanged after that.

**Layer 1: `nginx-proxy` — capture the original request info**

This is where the *true* original values exist — `nginx-proxy` is the first thing that sees the real client, so it needs to set these headers based on what it actually observed, not what it received from anything else:

```nginx
events {}

http {
  map $http_x_api_key $is_authorized {
    default 0;
    "your-secret-key-here" 1;
  }

  server {
    listen 80;

    location / {
      if ($is_authorized = 0) {
        return 403;
      }

      proxy_pass http://gateway:8080;
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header X-Forwarded-Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

- `$remote_addr` — nginx's built-in variable for the actual IP that connected to it (your Mac, your phone, wherever)
- `$host` — the `Host` header the original request came in with
- `$scheme` — `http` or `https`, whichever the original request used

**Layer 2: the gateway — receives these headers, logs them, and forwards them onward unchanged**

Since `fetch` doesn't automatically carry incoming headers to an outgoing request (they're two separate, independent requests), you need to explicitly read them off `req.headers` and set them again on the outgoing call:

```javascript
app.get('/:operation', async (req, res) => {
  const serviceName = services[req.params.operation];
  if (!serviceName) { /* ...existing 404 handling... */ }

  console.log(
    `LOG[gateway] - forwarded-for: ${req.headers['x-forwarded-for']} - forwarded-host: ${req.headers['x-forwarded-host']} - forwarded-proto: ${req.headers['x-forwarded-proto']}`
  );

  const { a, b } = req.query;
  const url = `http://${serviceName}:8080/${req.params.operation}?a=${a}&b=${b}`;

  const response = await fetch(url, {
    headers: {
      'X-Forwarded-For': req.headers['x-forwarded-for'],
      'X-Forwarded-Host': req.headers['x-forwarded-host'],
      'X-Forwarded-Proto': req.headers['x-forwarded-proto'],
    },
  });

  const data = await response.json();
  res.status(response.status).json(data);
});
```

**Layer 3: the backends — receive and log them too, via your existing `requestLog`**

Since `requestLog` already lives in `shared/loggers.js` and runs on every request, this is a good, small extension to it:

```javascript
export function requestLog(serverType) {
  return function (req, res, next) {
    console.log(
      `LOG[${serverType}] - ${new Date().toISOString()} - ${req.method} ${req.url} - forwarded-for: ${req.headers['x-forwarded-for'] || 'direct'} - forwarded-host: ${req.headers['x-forwarded-host'] || 'direct'} - forwarded-proto: ${req.headers['x-forwarded-proto'] || 'direct'} - params: ${JSON.stringify(req.params)} - query: ${JSON.stringify(req.query)} - body: ${JSON.stringify(req.body)}`,
    );
    next();
  };
}
```

The `|| 'direct'` fallback matters here: if you ever hit a backend service *directly* (bypassing the proxy and gateway entirely — which is still possible via your override file's exposed ports, 8081-8084), these headers simply won't exist, and this makes that visible in the logs rather than printing `undefined`.

**Why the gateway has to explicitly re-set them, not just "pass through automatically"**

This connects back to something we covered with `async`/`fetch`: each `fetch()` call the gateway makes is a **brand new, separate HTTP request** — it doesn't inherit anything from the incoming request unless you explicitly copy it over. This is genuinely a common real-world gotcha with proxies/gateways: forgetting this step is exactly how forwarded headers "mysteriously" stop working partway through a chain.

**Testing it end to end**

```bash
curl -H "X-API-Key: your-secret-key-here" "http://pi-docker.local:8888/add?a=5&b=3"
```
Then check `docker compose logs -f` — you should see the gateway's log line and the backend's log line both showing the same forwarded values, tracing the request's origin all the way through.

Want to try this on `add-service` and the gateway first, confirm the headers show up correctly in both logs, before rolling the `requestLog` change out to the other three services?