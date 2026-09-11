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

export function apiResponse(symbol, serverType) {
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
