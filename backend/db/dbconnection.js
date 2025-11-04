// db/dbconnection.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DBURI,
  ssl: { rejectUnauthorized: false },
});

pool.on("connect", () => {
  console.log("✅ Database connected successfully");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected DB error:", err);
  process.exit(-1);
});

export default pool;
