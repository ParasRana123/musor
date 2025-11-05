// db/dbconnection.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

// Enhanced pool configuration for Neon (serverless PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DBURI,
  ssl: { rejectUnauthorized: false },
  // Connection pool settings for serverless databases
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
  // For Neon, we want to allow connections to be closed gracefully
  allowExitOnIdle: false,
});

// Handle connection events
pool.on("connect", (client) => {
  console.log("✅ Database connected successfully");
});

pool.on("error", (err, client) => {
  console.error("❌ Unexpected DB error on idle client:", err.message);
  // Don't exit the process - let the pool handle reconnection
  // The pool will automatically try to reconnect on next query
});

// Handle pool errors (different from client errors)
pool.on("poolError", (err) => {
  console.error("❌ Pool error:", err.message);
  // Log but don't crash - the pool will handle retries
});

// Graceful shutdown
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
