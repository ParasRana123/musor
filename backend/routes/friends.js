import express from "express";
import pool from "../db/dbconnection.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

// Add a friend
router.post("/", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { friendUserId } = req.body;

    if (!friendUserId) {
      return res.status(400).json({ error: "Friend user ID is required" });
    }

    if (userId === friendUserId) {
      return res.status(400).json({ error: "Cannot add yourself as a friend" });
    }

    // Get current user
    const user = await pool.query(
      "SELECT * FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get friend user
    const friend = await pool.query(
      "SELECT * FROM users WHERE clerk_user_id = $1",
      [friendUserId]
    );

    if (friend.rows.length === 0) {
      return res.status(404).json({ error: "Friend user not found" });
    }

    // Check if friendship already exists
    const existingFriendship = await pool.query(
      "SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
      [user.rows[0].id, friend.rows[0].id]
    );

    if (existingFriendship.rows.length > 0) {
      return res.status(400).json({ error: "Friendship already exists" });
    }

    // Check if a pending friend request already exists
    const existingRequest = await pool.query(
      `SELECT * FROM motifications WHERE sender = $1 AND reciever = $2 AND type = 'send_req'`,
      [userId, friendUserId]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: "Friend request already sent" });
    }

    // Only send notification (don't create friendship yet - wait for acceptance)
    try {
      await pool.query(
        `INSERT INTO motifications (sender, reciever, type) VALUES ($1, $2, $3)`,
        [userId, friendUserId, "send_req"]
      );
      console.log(`✅ Friend request sent to ${friendUserId} from ${userId}`);
    } catch (notificationError) {
      // Log error and fail if notification fails
      if (notificationError.code === '42P01') {
        console.error("⚠️ Notifications table does not exist. Please run: backend/db/create_notifications_table.sql");
        return res.status(500).json({ error: "Notifications table does not exist. Please run the SQL script." });
      } else {
        console.error("⚠️ Error sending friend request:", notificationError.message);
        return res.status(500).json({ error: "Failed to send friend request" });
      }
    }

    res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Error adding friend:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all friends
// router.get("/", requireAuth(), async (req, res) => {
//   try {
//     const { userId } = req.auth;

//     // Get current user
//     const user = await pool.query(
//       "SELECT * FROM users WHERE clerk_user_id = $1",
//       [userId]
//     );

//     if (user.rows.length === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Get all friends (both directions)
//     const friends = await pool.query(
//       `SELECT u.id, u.clerk_user_id, u.username, u.email, f.created_at
//        FROM friends f
//        JOIN users u ON (f.friend_id = u.id AND f.user_id = $1) OR (f.user_id = u.id AND f.friend_id = $1)
//        WHERE u.id != $1
//        ORDER BY f.created_at DESC`,
//       [user.rows[0].id]
//     );

//     res.status(200).json({ friends: friends.rows });
//   } catch (error) {
//     console.error("Error getting friends:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

router.get("/getall" , requireAuth() , async (req , res) => {
  try {
    const { userId } = req.auth;

    const allUsers = await pool.query("SELECT username, email, clerk_user_id FROM users WHERE clerk_user_id != $1", [userId]);
    const sentRequests = await pool.query(
      `SELECT reciever FROM motifications WHERE sender = $1 AND type = 'send_req'`, [userId]
    )

    const receivedRequests = await pool.query(
      `SELECT sender FROM motifications WHERE reciever = $1 AND type = 'send_req'`, [userId]
    )

    const friends = await pool.query(
      `SELECT u.clerk_user_id 
      FROM friends f
      JOIN users u ON (f.friend_id = u.id AND f.user_id = (SELECT id FROM users WHERE clerk_user_id = $1))
      OR (f.user_id = u.id AND f.friend_id = (SELECT id FROM users WHERE clerk_user_id = $1))`,
      [userId]
    )

    const sentSet = new Set(sentRequests.rows.map(r => r.reciever));
    const receivedSet = new Set(receivedRequests.rows.map(r => r.sender));
    const friendSet = new Set(friends.rows.map(f => f.clerk_user_id));

    const usersWithStatus = allUsers.rows.map(user => {
      let status = "none";
      if(friendSet.has(user.clerk_user_id)) status = "friend";
      else if(sentSet.has(user.clerk_user_id)) status = "requested";
      else if(receivedSet.has(user.clerk_user_id)) status = "incoming";
      
      return { ...user , status };
    })

    res.status(200).json(usersWithStatus);
  } catch(e) {
    console.log("Error fetching all users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/accept", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { friendUserId } = req.body;

    const user = await pool.query("SELECT * FROM users WHERE clerk_user_id = $1", [userId]);
    const friend = await pool.query("SELECT * FROM users WHERE clerk_user_id = $1", [friendUserId]);

    if (!user.rows.length || !friend.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete pending request
    await pool.query(
      "DELETE FROM motifications WHERE sender = $1 AND reciever = $2 AND type = 'send_req'",
      [friendUserId, userId]
    );

    // Add to friends
    await pool.query(
      "INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)",
      [user.rows[0].id, friend.rows[0].id]
    );

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Remove a friend
router.delete("/:friendUserId", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { friendUserId } = req.params;

    // Get current user
    const user = await pool.query(
      "SELECT * FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get friend user
    const friend = await pool.query(
      "SELECT * FROM users WHERE clerk_user_id = $1",
      [friendUserId]
    );

    if (friend.rows.length === 0) {
      return res.status(404).json({ error: "Friend user not found" });
    }

    // Remove friendship (both directions)
    await pool.query(
      "DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
      [user.rows[0].id, friend.rows[0].id]
    );

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

