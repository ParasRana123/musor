// db/dbconnection.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DBURI,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
});

pool.on("connect", (client) => {
  console.log("✅ Database connected successfully");
});

pool.on("error", (err, client) => {
  console.error("❌ Unexpected DB error on idle client:", err.message);
});

pool.on("poolError", (err) => {
  console.error("❌ Pool error:", err.message);
});

process.on("SIGINT", async () => {
  console.log("Closing database pool...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Closing database pool...");
  await pool.end();
  process.exit(0);
});

export default pool;
