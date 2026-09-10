import express from "express";

const api = express();
const port = 8080;
const endpoint = "/add";
const mathmatic = "add";
const symbol = "+";
const operations = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
};

api.use(express.json());

function requestLogger(req, res, next) {
  console.log(
    `LOG[${mathmatic}] - ${new Date().toISOString()} - ${req.method} ${req.url} - params: ${JSON.stringify(req.params)} - query: ${JSON.stringify(req.query)} - body: ${JSON.stringify(req.body)}`,
  );
  next();
}

function errorLog(req, errorMessage) {
  console.log(
    `ERROR LOG[${mathmatic}] - Error: ${errorMessage} - ${new Date().toISOString()} - ${req.method} ${req.url} - params: ${JSON.stringify(req.params)} - query: ${JSON.stringify(req.query)} - body: ${JSON.stringify(req.body)}`,
  );
}

function validateNumbers(req, res, next) {
  const { a, b } = req.query;
  if (a === undefined || b === undefined) {
    errorLog(req, 'Both "a" and "b" query parameters are required');
    return res.status(400).json({
      error_message: {
        error: 'Both "a" and "b" query parameters are required',
        input: { a: a === undefined ? null : a, b: b === undefined ? null : b },
      },
    });
  }

  const numA = Number(a);
  const numB = Number(b);

  if (isNaN(numA) || isNaN(numB)) {
    errorLog(req, '"a" and "b" must both be valid numbers');
    return res.status(400).json({
      error_message: {
        error: '"a" and "b" must both be valid numbers',
        input: { a: isNaN(numA) ? a : numA, b: isNaN(numB) ? b : numB },
      },
    });
  }

  req.numA = numA;
  req.numB = numB;
  next();
}

api.get("/health", requestLogger, (req, res) => {
  res.json({ status: "ok", method: req.method, port: port, url: req.url });
});

api.get(endpoint, requestLogger, validateNumbers, (req, res) => {
  const result = operations[symbol](req.numA, req.numB);
  res.json({
    mathmatic: mathmatic,
    symbol: symbol,
    input: { a: req.numA, b: req.numB },
    result: result,
  });
});

// start the  server
api.listen(port, () => {
  console.log("Server is running on http://localhost:", port, endpoint);
});
// var http = require('http') , https = require('https') , express = require('express') , app = express();
// http.createServer(app).listen(80); https.createServer({ ... }, app).listen(443);
