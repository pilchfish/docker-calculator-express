export function requestLog(serverType) {
  return function (req, res, next) {
    console.log(
      `LOG[${serverType}] - ${new Date().toISOString()} - ${req.method} ${req.url} - params: ${JSON.stringify(req.params)} - query: ${JSON.stringify(req.query)} - body: ${JSON.stringify(req.body)}`,
    );
    next();
  };
}

export function errorLog(serverType, errorMessage, req) {
  console.log(
    `ERROR LOG[${serverType}] - Error: ${errorMessage} - ${new Date().toISOString()} - ${req.method} ${req.url} - params: ${JSON.stringify(req.params)} - query: ${JSON.stringify(req.query)} - body: ${JSON.stringify(req.body)}`,
  );
}

