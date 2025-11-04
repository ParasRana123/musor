import express from "express";
import pool from "../db/dbconnection.js";
import { clerkClient, requireAuth } from "@clerk/express";

const router = express.Router();

router.post("/", requireAuth(), async (req, res) => {
  try { 
    console.log(req.body)
    const { userId } = req.auth; 
    const user=await pool.query("SELECT * FROM users WHERE clerk_user_id = $1", [userId]) 
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    } 
    // check if user  has vieewd this music  
    console.log(req.body.link,req.body.fav,user.rows[0].clerk_user_id) 
    if (!req.body.link || !req.body.fav || !user.rows[0].clerk_user_id) {
      return res.status(400).json({ error: "Invalid request" });
    }
    const exist = await pool.query(
      "SELECT * FROM music WHERE musicid = $1 AND clerk_user_id = $2",
      [req.body.link, user.rows[0].clerk_user_id]
    );
    if (exist.rows.length > 0) { 
      const response=await pool.query(
        "UPDATE music SET isfav = $1 WHERE musicid = $2 AND clerk_user_id = $3",
        [req.body.fav, req.body.link, user.rows[0].clerk_user_id]
      );
      return res.status(200).json({ message: "Music updated successfully" });
    }
    const { link, fav } = req.body;
    const result = await pool.query(
      "INSERT INTO music (musicid,clerk_user_id,isfav) VALUES ($1, $2,$3) RETURNING *",
      [link, user.rows[0].clerk_user_id, fav]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error adding store:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}); 

router.get("/checkifliked", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth; 
    console.log(userId)
    const user = await pool.query("SELECT * FROM users WHERE clerk_user_id = $1", [userId])
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const { link } = req.query;
    const exist = await pool.query(
      "SELECT * FROM music WHERE musicid = $1 AND clerk_user_id = $2",
      [link, user.rows[0].clerk_user_id]
    );
    if (exist.rows.length > 0) {
      return res.status(200).json({ liked: true });
    }
    return res.status(200).json({ liked: false });
  } catch (error) {
    console.error("Error checking if liked:", error);
    res.status(500).json({ error: "Internal server error" });
  }
})
export default router;
