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
  const url = `http://${serviceName}:8080/${req.params.operation}?a=${a}&b=${b}`;

  const response = await fetch(url);
  const dataBody = await response.json();

  res.status(response.status).json(dataBody);
});

gateway.listen(port, () => {
  console.log[("[gateway] is running on http://localhost:", port)];
});
