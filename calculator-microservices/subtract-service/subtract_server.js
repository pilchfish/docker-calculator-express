import express from "express";
import { requestLog } from "../../shared/loggers.js";
import { healthCheck, apiResponse } from "../../shared/responses.js";
import { validateNumbers as validateParameters } from "../../shared/validation.js";

const api = express();
const port = Number(process.env.PORT || 8080);
const endpoint = process.env.ENDPOINT || "/subtract";
const serverType = process.env.SERVER_TYPE || "subtract-server";
const symbol = process.env.SYMBOL || "-";

api.use(express.json());
api.use(requestLog(serverType));

const healthLogger = healthCheck(serverType, port);
api.get("/health", healthLogger);

api.get(
  endpoint,
  validateParameters(serverType),
  apiResponse(symbol, serverType),
);

// start the  server
api.listen(port, () => {
  console.log("Server is running on http://localhost:", port, endpoint);
});
