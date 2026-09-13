import express from "express";
import { requestLog, serverStartUp, errorLog } from "../../shared/loggers.js";
import {
  healthCheck,
  apiResponseSuccess,
  apiResponseEndpointNotFound,
  apiResponseUnknownServerError as apiResponseServerError,
} from "../../shared/responses.js";
import { validateNumbers as validateParameters } from "../../shared/validation.js";

const api = express();
const port = Number(process.env.PORT || 8080);
const endpoint = process.env.ENDPOINT;
const serverType = process.env.SERVER_TYPE;
const symbol = process.env.SYMBOL;

api.use(express.json());
api.use(requestLog(serverType));

const healthLogger = healthCheck(serverType, port);
api.get("/health", healthLogger);

api.get(
  endpoint,
  validateParameters(serverType),
  checkDivideByZero(serverType),
  apiResponseSuccess(symbol, serverType),
);

api.use(apiResponseEndpointNotFound(endpoint));

api.use(apiResponseServerError(serverType));

// start the  server
api.listen(port, serverStartUp(serverType, port, endpoint));

function checkDivideByZero(serverType) {
  return function (req, res, next) {
    if (req.numB === 0) {
      errorLog(serverType, "Cannot divide by zero", req);
      return res.status(400).json({
        error_message: {
          error: "Cannot divide by zero",
          input: { a: req.numA, b: req.numB },
        },
      });
    }
    next();
  };
}