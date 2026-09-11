import { errorLog } from "./loggers.js";

export function validateNumbers(serverType) {
  return function (req, res, next) {
    const { a, b } = req.query;
    if (a === undefined || b === undefined) {
      errorLog(
        serverType,
        'Both "a" and "b" query parameters are required',
        req,
      );
      return res.status(400).json({
        error_message: {
          error: 'Both "a" and "b" query parameters are required',
          input: {
            a: a === undefined ? null : a,
            b: b === undefined ? null : b,
          },
        },
      });
    }

    const numA = Number(a);
    const numB = Number(b);

    if (isNaN(numA) || isNaN(numB)) {
      errorLog(serverType, '"a" and "b" must both be valid numbers', req);
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
  };
}
