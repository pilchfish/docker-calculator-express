export function requestLog(serverType) {
  return function (req, res, next) {
    console.log(
      `LOG[${serverType}] - ${new Date().toISOString()} - ${req.method} ${req.url} - forwarded-for: ${req.headers["x-forwarded-for"] || "direct"} - forwarded-host: ${req.headers["x-forwarded-host"] || "direct"} - forwarded-proto: ${req.headers["x-forwarded-proto"] || "direct"} - params: ${JSON.stringify(req.params)} - query: ${JSON.stringify(req.query)} - body: ${JSON.stringify(req.body) || "no-data-body"}`,
    );
    next();
  };
}

export function errorLog(serverType, errorMessage, req) {
  console.log(
    `ERROR LOG[${serverType}] - Error: ${errorMessage} - ${new Date().toISOString()} - ${req.method} ${req.url} - params: ${JSON.stringify(req.params)} - query: ${JSON.stringify(req.query)} - body: ${JSON.stringify(req.body)}`,
  );
}

export function serverStartUp(serverType, port, endpoint) {
  return function () {
    console.log(
      "[",
      serverType,
      "] is running on http://localhost:",
      port,
      endpoint,
    );
  };
}
