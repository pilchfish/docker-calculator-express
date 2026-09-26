import express from "express";

const gateway = express();
const port = Number(process.env.PORT || 8080);

const services = {
  add: "add-service",
  subtract: "subtract-service",
  multiply: "multiply-service",
  divide: "divide-service",
};

gateway.get("/:operation", async (req, res) => {
  const serviceName = services[req.params.operation];

  if (!serviceName) {
    return res.status(404).json({
      error_message: {
        error: `Unknown operation: ${req.params.operation}`,
        available_operations: Object.keys(services),
      },
    });
  }

  const { a, b } = req.query;
  console.log("[gateway] parameter 'a'=", a, " parameter 'b'=", b);
  const url = `http://${serviceName}:8080/${req.params.operation}?a=${a}&b=${b}`;

  const forwardHeaders = {};
  if (req.headers["x-forwarded-for"]) {
    forwardHeaders["X-Forwarded-For"] = req.headers["x-forwarded-for"];
  }
  if (req.headers["x-forwarded-host"]) {
    forwardHeaders["X-Forwarded-Host"] = req.headers["x-forwarded-host"];
  }
  if (req.headers["x-forwarded-proto"]) {
    forwardHeaders["X-Forwarded-Proto"] = req.headers["x-forwarded-proto"];
  }
    console.log(
      `[gateway] X-Forwarded-For: [${forwardHeaders["X-Forwarded-For"]}] - X-Forwarded-Host: [${forwardHeaders["X-Forwarded-Host"]}] - X-Forwarded-Proto: [${forwardHeaders["X-Forwarded-Proto"]}]`,
    );

  const response = await fetch(url, { headers: forwardHeaders });

  /* Why the gateway has to explicitly re-set them, not just "pass through automatically"
This connects back to something we covered with async/fetch: each fetch() call the gateway makes is a brand new, separate HTTP request
 — it doesn't inherit anything from the incoming request unless you explicitly copy it over. This is genuinely a common real-world gotcha with proxies/gateways: forgetting this step is exactly how forwarded headers "mysteriously" stop working partway through a chain.
 */

  const dataBody = await response.json();

  res.status(response.status).json(dataBody);
});

gateway.listen(port, () => {
  console.log[("[gateway] is running on http://localhost:", port)];
});
