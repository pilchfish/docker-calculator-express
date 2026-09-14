import { errorLog } from "./loggers.js";

const operations = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
};

export function healthCheck(serverType, port) {
  return function (req, res, next) {
    res.json({
      server: `${serverType}`,
      details: { status: "ok", method: req.method, port: port, url: req.url },
    });
    next();
  };
}

export function apiResponseSuccess(symbol, serverType) {
  return function (req, res) {
    const result = operations[symbol](req.numA, req.numB);
    res.json({
      mathmatic: serverType,
      symbol: symbol,
      input: { a: req.numA, b: req.numB },
      result: result,
    });
  };
}

export function apiResponseEndpointNotFound(endpoint) {
  return (req, res) => {
    res.status(404).json({
      error_message: {
        error: `Endpoint not found: ${req.method} ${req.url}`,
        available_endpoints: [endpoint, "/health"],
      },
    });
  };
}

export function apiResponseUnknownServerError(serverType) {
  return function (err, req, res, next) {
    errorLog(serverType, err.message, req);
    res.status(500).json({
      error_message: {
        error: "Something went wrong on our end",
      },
    });
  };
}
