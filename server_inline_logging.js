import { parseArgs } from "node:util";
import express from "express";

const app = express();

// const port = 8080;
const { values } = parseArgs({ options: { port: { type: "string" } } });
const port = values.port || 8080;

// Middleware to parse JSON requests
app.use(express.json());

// global logging middleware
app.use((req, res, next) => {
  console.log(
    `GLOBAL LOG - ${new Date().toISOString()} - ${req.method} ${req.url}`,
  );
  next();
});

// beginner way inline logging middleware

app.get("/add", (req, res) => {
  const { numA, numB, error } = parseNumbers(req.query);
  if (error) return res.status(400).json({ error });
  res.json({ result: numA + numB });
});

app.get("/subtract", (req, res) => {
  const { numA, numB, error } = parseNumbers(req.query);
  if (error) return res.status(400).json({ error });
  res.json({ result: numA - numB });
});

app.get("/multiply", (req, res) => {
  const { numA, numB, error } = parseNumbers(req.query);
  if (error) return res.status(400).json({ error });
  res.json({ result: numA * numB });
});

app.get("/divide", (req, res) => {
  const { numA, numB, error } = parseNumbers(req.query);
  if (error) return res.status(400).json({ error });
  if (numB === 0)
    return res.status(400).json({ error: "Cannot divide by zero" });
  res.json({ result: numA / numB });
});

function parseNumbers(query) {
  const { a, b } = query;
  if (a === undefined || b === undefined) {
    return { error: 'Both "a" and "b" query parameters are required' };
  }

  const numA = Number(a);
  const numB = Number(b);

  if (isNaN(numA) || isNaN(numB)) {
    return { error: '"a" and "b" must both be valid numbers' };
  }

  return { numA, numB };
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
