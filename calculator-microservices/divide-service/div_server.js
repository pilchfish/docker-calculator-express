import express from "express";
import { requestLog } from "../../shared/loggers.js";
import { healthCheck, apiResponse } from "../../shared/responses.js";
import { validateNumbers as validateParameters } from "../../shared/validation.js";

const api = express();
const port = 8080;
const serverType = "divide";
const endpoint = "/divide";
const symbol = "/";

api.use(express.json());
api.use(requestLog(serverType));

const healthLogger = healthCheck(serverType, port);
api.get("/health", healthLogger);

api.get(
  endpoint,
  validateParameters(serverType),
  divideByZeroCheck,
  apiResponse(symbol, serverType),
);

function divideByZeroCheck(req, res, next) {
  if (req.numB === 0) {
    errorLog(req, "Cannot divide by zero");
    return res.status(400).json({
      error_message: {
        error: "Cannot divide by zero",
        input: { a: req.numA, b: req.numB },
      },
    });
  }
  next();
}

// start the  server
api.listen(port, () => {
  console.log("Server is running on http://localhost:", port, endpoint);
});
