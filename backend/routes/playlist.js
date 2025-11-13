import express from "express";  
import pool from "../db/dbconnection.js";
import { requireAuth } from "@clerk/express";
const router=express.Router()
import { clerkClient } from "@clerk/clerk-sdk-node";
// async function getPlaylist(req,res){
//     try {
//         const {userId} = req.auth;
//         const user = await pool.query("SELECT * FROM users WHERE clerk_user_id = $1", [userId])
//         if(user.rows.length === 0){
//             return res.status(404).json({error:"User not found"})
//         }
//         const playlist=await pool.query("SELECT * FROM music WHERE clerk_user_id = $1 AND isfav = true", [userId])
//         return res.status(200).json({playlist:playlist.rows})
//     } catch (error) {
//         res.status(500).json({error:"Internal server error"})
//     }
// }

router.get("/", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;

    const userResult = await pool.query("SELECT * FROM users WHERE clerk_user_id = $1", [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const playlist = await pool.query(
      "SELECT * FROM music WHERE clerk_user_id = $1 AND isfav = true",
      [userId]
    );
    const clerkUser = await clerkClient.users.getUser(userId);
    return res.status(200).json({
      user: {
        ...userResult.rows[0],
        imageUrl: clerkUser.imageUrl,
        username: clerkUser.username || clerkUser.firstName || "Music Lover",
        email: clerkUser.primaryEmailAddress?.emailAddress,
      },
      playlist: playlist.rows,
    });
  } catch (error) {
    console.error("Error fetching own playlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🟣 Friend’s Playlist
router.get("/:id", requireAuth(), async (req, res) => {
  try {
    const friendId = req.params.id;

    const userResult = await pool.query("SELECT * FROM users WHERE clerk_user_id = $1", [friendId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const playlist = await pool.query(
      "SELECT * FROM music WHERE clerk_user_id = $1 AND isfav = true",
      [friendId]
    );
    const clerkUser = await clerkClient.users.getUser(friendId);
    return res.status(200).json({
      user: {
        ...userResult.rows[0],
        imageUrl: clerkUser.imageUrl,
        username: clerkUser.username || clerkUser.firstName || "Music Lover",
        email: clerkUser.primaryEmailAddress?.emailAddress,
      },
      playlist: playlist.rows,
    });
  } catch (error) {
    console.error("Error fetching friend's playlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;