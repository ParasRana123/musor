import express from "express";
import pool from "../db/dbconnection.js";
import { clerkClient, requireAuth } from "@clerk/express";

const router = express.Router();

router.post("/", requireAuth(), async (req, res) => {
  try { 
    const { userId } = req.auth;

    if (!userId) {
      console.error("❌ No userId found in auth");
      return res.status(401).json({ error: "User ID not found in authentication" });
    }

    console.log("🔄 Syncing user:", userId);

    // Fetch user from Clerk
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress || null;
    const username = user.username || user.firstName || "Unknown user";

    console.log("📋 User data:", { userId, username, email });

    // Check if user exists
    const exist = await pool.query(
      "SELECT * FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (exist.rows.length === 0) {
      // User doesn't exist, insert them
      console.log("➕ Inserting new user...");
      const insertResult = await pool.query(
        "INSERT INTO users (clerk_user_id, username, email) VALUES ($1, $2, $3) RETURNING *",
        [userId, username, email]
      );
      
      if (insertResult.rows.length === 0) {
        console.error("❌ INSERT query returned no rows");
        return res.status(500).json({ error: "Failed to insert user - no rows returned" });
      }
      
      console.log("✅ User inserted successfully:", insertResult.rows[0]);
      return res.status(201).json({ 
        message: "User created successfully",
        user: insertResult.rows[0]
      });
    } else {
      // User exists, optionally update their info
      console.log("✅ User already exists:", exist.rows[0]);
      
      // Optionally update user info if it changed
      const updateResult = await pool.query(
        "UPDATE users SET username = $1, email = $2 WHERE clerk_user_id = $3 RETURNING *",
        [username, email, userId]
      );
      
      return res.status(200).json({ 
        message: "User synced successfully",
        user: updateResult.rows[0] || exist.rows[0]
      });
    }
  } catch (error) {
    console.error("❌ Error syncing user:", error);
    
    // Provide more detailed error information
    const errorMessage = error.message || "Internal server error";
    const errorDetails = {
      message: errorMessage,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    };
    
    console.error("Error details:", errorDetails);
    
    // Check for specific database errors
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ 
        error: "User already exists",
        details: errorDetails
      });
    }
    
    if (error.code === '23502') { // Not null violation
      return res.status(400).json({ 
        error: "Required field missing",
        details: errorDetails
      });
    }
    
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

export default router;
