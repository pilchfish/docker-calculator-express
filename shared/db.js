import pg from "pg";

const pool = new pg.Pool({
  host: "logs-db",
  user: "calc_logs",
  password: "some-password",
  database: "calc_logs",
});

export async function logRequestToDb(serviceName, req, statusCode) {
  await pool.query(
    `INSERT INTO request_logs (service_name, method, path, forwarded_for, forwarded_host, forwarded_proto, status_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      serviceName,
      req.method,
      req.originalUrl,
      req.headers["x-forwarded-for"] || 'direct',
      req.headers["x-forwarded-host"] || 'direct',
      req.headers["x-forwarded-proto"] || 'direct',
      statusCode,
    ],
  );
}
