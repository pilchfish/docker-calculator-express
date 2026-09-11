Good observation — and to be clear upfront, you haven't done anything wrong here. Both are valid, and you've actually spotted a real distinction in Express worth understanding properly: **middleware can be attached in different places, and where you attach it changes when it runs.**

**`app.use(requestLogger('add-service'))` — applies to every route**

```javascript
app.use(requestLogger('add-service'));

app.get('/add', validateNumbers, (req, res) => { ... });
app.get('/health', healthCheck);
```

When you register middleware with `app.use()` (with no path, or a general path), it runs on **every request that comes into the app**, regardless of which route it eventually matches. So both `/add` and `/health` would get logged, without you needing to mention `requestLogger` again on each route.

**`api.get("/health", requestLogger(serverType), healthCheck)` — applies to just this one route**

```javascript
app.get('/health', requestLogger(serverType), healthCheck);
```

This attaches the middleware **only to this specific route**. Express lets you list as many middleware functions as you like between the path and the final handler, and it runs them left to right: `requestLogger(serverType)` first, then `healthCheck`. Any *other* route (like `/add`) wouldn't get this logging at all, unless you added `requestLogger(serverType)` to that route too.

**Both call `requestLogger(...)` the same correct way**

This is the important bit to notice: in both cases, you (or I) called `requestLogger(...)` **immediately, with an argument** — producing the ready-to-use inner function — before handing it to Express. The only difference is *where* that finished middleware got registered: globally (`app.use`) versus on one specific route (`app.get('/health', ...)`). Neither is "more correct" in general — it depends on whether you want the behavior everywhere or just in one place.

**When would you actually choose one over the other?**

- **`app.use()`** — good for things that should apply broadly and consistently: logging every request, checking authentication on every route, parsing JSON bodies (`express.json()`), etc.
- **Route-specific middleware** — good for things that only make sense for particular routes: your divide-by-zero check only matters on `/divide`; maybe you want extra-detailed logging just on `/health` for monitoring purposes, but the standard logger everywhere else.

**Given your microservices setup specifically**: since you're running four tiny services, each with only one or two routes, it's genuinely a judgment call whether `app.use()` (log absolutely everything, simplest to write once) or per-route (log selectively) fits better. If you want *every* route logged the same way — which sounds like your original intent with the shared logger — `app.use(requestLogger(serverType))` near the top of the file is the simpler, more DRY choice, since you write it once instead of repeating it on every single route.

Is your `/health` route meant to be logged differently than your `/add`/`/subtract`/etc. routes, or were you just experimenting with the route-specific version to see how it worked?