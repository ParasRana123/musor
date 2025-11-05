import express from "express";
import pool from "../db/dbconnection.js";
import { clerkClient, requireAuth } from "@clerk/express";

const router = express.Router();

router.post("/", requireAuth(), async (req, res) => {
  try { 
    const { userId } = req.auth;
    console.log(userId)
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress || null;
    const username = user.username || user.firstName || "Unknown user";

    const exist = await pool.query(
      "SELECT * FROM users WHERE clerk_user_id = $1",
      [userId]
    );
    console.log(exist.rows)
    if (exist.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (clerk_user_id, username, email) VALUES ($1, $2, $3)",
        [userId, username, email]
      );
    }
    else{
      console.log("User already exists")
    }
    console.log("User synced successfully");
    res.status(200).json({ message: "User synced successfully" });
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
