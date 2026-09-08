import { parseArgs } from "node:util";
import express from "express";

const app = express();
// const port = 8080;

const { values } = parseArgs({ options: { port: { type: "string" } } });
const port = values.port || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// global logging middleware
app.use((req, res, next) => {
  console.log(
    `GLOBAL LOG - ${new Date().toISOString()} - ${req.method} ${req.url}`,
  );
  next();
});

function logRequest(req, res, next) {
  console.log(
    `DETAILED LOG - ${new Date().toISOString()} - ${req.method} ${req.url} - params: ${JSON.stringify(req.params)} - query: ${JSON.stringify(req.query)} - body: ${JSON.stringify(req.body)}`,
//   console.log(
    // `DETAILED LOG - ${new Date().toISOString()} - ${req.method} ${req.url} - params:`,
    // req.query,
  );
  next();
}

// Sample route
app.get("/", logRequest, (req, res) => {
  res.send("Hello, to my API World!");
});

// Express way
app.get("/add", logRequest, validateNumbers, (req, res) => {
  res.json({ result: req.numA + req.numB });
});

app.get("/subtract", logRequest, validateNumbers, (req, res) => {
  res.json({ result: req.numA - req.numB });
});

app.get("/multiply", logRequest, validateNumbers, (req, res) => {
  res.json({ result: req.numA * req.numB });
});

app.get("/divide", logRequest, validateNumbers, (req, res) => {
  if (req.numB === 0)
    return res.status(400).json({ error: "Cannot divide by zero" });
  res.json({ result: req.numA / req.numB });
});

function validateNumbers(req, res, next) {
  const { a, b } = req.query;
  if (a === undefined || b === undefined) {
    return res
      .status(400)
      .json({ error: 'Both "a" and "b" query parameters are required' });
  }

  const numA = Number(a);
  const numB = Number(b);

  if (isNaN(numA) || isNaN(numB)) {
    return res
      .status(400)
      .json({ error: '"a" and "b" must both be valid numbers' });
  }

  // Attach the parsed numbers to the request so the route handlers can access them
  req.numA = numA;
  req.numB = numB;

  next(); // Call the next middleware or route handler
}

// beguinner way

// app.get("/add", (req, res) => {
//   const { numA, numB, error } = parseNumbers(req.query);
//   if (error) return res.status(400).json({ error });
//   res.json({ result: numA + numB });
// });

// app.get("/subtract", (req, res) => {
//   const { numA, numB, error } = parseNumbers(req.query);
//   if (error) return res.status(400).json({ error });
//   res.json({ result: numA - numB });
// });

// app.get("/multiply", (req, res) => {
//   const { numA, numB, error } = parseNumbers(req.query);
//   if (error) return res.status(400).json({ error });
//   res.json({ result: numA * numB });
// });

// app.get("/divide", (req, res) => {
//   const { numA, numB, error } = parseNumbers(req.query);
//   if (error) return res.status(400).json({ error });
//   if (numB === 0)
//     return res.status(400).json({ error: "Cannot divide by zero" });
//   res.json({ result: numA / numB });
// });

// function parseNumbers(query) {
//   const { a, b } = query;
//   if (a === undefined || b === undefined) {
//     return { error: 'Both "a" and "b" query parameters are required' };
//   }

//   const numA = Number(a);
//   const numB = Number(b);

//   if (isNaN(numA) || isNaN(numB)) {
//     return { error: '"a" and "b" must both be valid numbers' };
//   }

//   return { numA, numB };
// }

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
