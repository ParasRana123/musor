import express from "express";
import pool from "../db/dbconnection.js";
import { requireAuth , clerkClient } from "@clerk/express";

const router = express.Router();

router.get("/", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const notificationResults = await pool.query(
      `SELECT * FROM motifications WHERE reciever = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const notifications = notificationResults.rows;
    if (notifications.length === 0) {
      return res.status(200).json({ notifications: [] });
    }
    const senderIds = [...new Set(notifications.map(n => n.sender))];
    const senderData = await Promise.all(
      senderIds.map(async (id) => {
        try {
          const user = await clerkClient.users.getUser(id);
          return {
            id,
            username:
              user.username ||
              `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
              "Unknown User",
            imageUrl: user.imageUrl || null,
          };
        } catch (e) {
          console.warn(`Failed to fetch sender ${id}:`, e.message);
          return { id, username: "Unknown User", imageUrl: null };
        }
      })
    );
    const enrichedNotifications = notifications.map((n) => {
      const senderInfo = senderData.find((u) => u.id === n.sender) || {
        username: "Unknown User",
        imageUrl: null,
      };
      return { ...n, senderInfo };
    });

    res.status(200).json({ notifications: enrichedNotifications });
  } catch (error) {
    console.error("Error getting notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Send a notification (create a friend request notification)
router.post("/send", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { receiver, type } = req.body;

    if (!receiver) {
      return res.status(400).json({ error: "Receiver is required" });
    }

    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }

    // Insert notification
    const result = await pool.query(
      `INSERT INTO motifications (sender, reciever, type) VALUES ($1, $2, $3) RETURNING *`,
      [userId, receiver, type]
    );

    res.status(200).json({
      message: "Notification sent successfully",
      notification: result.rows[0],
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: "Notifications table does not exist. Please run the SQL script: backend/db/create_notifications_table.sql" 
      });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Respond to a notification (accept/reject friend request)
router.post("/respond", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { sender, response } = req.body;

    if (!sender || !response) {
      return res.status(400).json({ error: "Sender and response are required" });
    }

    if (!["accept", "reject"].includes(response)) {
      return res.status(400).json({ error: "Response must be 'accept' or 'reject'" });
    }

    // Get current user
    const user = await pool.query(
      "SELECT * FROM users WHERE clerk_user_id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get sender user
    const senderUser = await pool.query(
      "SELECT * FROM users WHERE clerk_user_id = $1",
      [sender]
    );

    if (senderUser.rows.length === 0) {
      return res.status(404).json({ error: "Sender user not found" });
    }

    // If accepting, create the friendship
    if (response === "accept") {
      // Check if friendship already exists
      const existingFriendship = await pool.query(
        "SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
        [user.rows[0].id, senderUser.rows[0].id]
      );

      if (existingFriendship.rows.length === 0) {
        // Create friendship (bidirectional)
        await pool.query(
          "INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)",
          [user.rows[0].id, senderUser.rows[0].id]
        );
        console.log(`✅ Friendship created between ${userId} and ${sender}`);
      }
    }

    // Delete the original friend request notification
    await pool.query(
      `DELETE FROM motifications WHERE sender = $1 AND reciever = $2 AND type = 'send_req'`,
      [sender, userId]
    );

    // Insert response notification
    const result = await pool.query(
      `INSERT INTO motifications (sender, reciever, type) VALUES ($1, $2, $3) RETURNING *`,
      [userId, sender, response]
    );

    res.status(200).json({
      message: response === "accept" ? "Friend request accepted" : "Friend request rejected",
      notification: result.rows[0],
    });
  } catch (error) {
    console.error("Error responding to notification:", error);
    
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: "Notifications table does not exist. Please run the SQL script: backend/db/create_notifications_table.sql" 
      });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark notification as read
router.put("/:notificationId/read", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { notificationId } = req.params;

    // Update notification to mark as read
    // Note: You may need to add an 'is_read' column to your motifications table
    const result = await pool.query(
      `UPDATE motifications SET is_read = true WHERE id = $1 AND reciever = $2 RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json({
      message: "Notification marked as read",
      notification: result.rows[0],
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    // If is_read column doesn't exist, just return success
    if (error.message.includes("column") && error.message.includes("does not exist")) {
      return res.status(200).json({ message: "Feature not yet implemented" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a notification
router.delete("/:notificationId", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;
    const { notificationId } = req.params;

    const result = await pool.query(
      `DELETE FROM motifications WHERE id = $1 AND reciever = $2 RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: "Notifications table does not exist. Please run the SQL script: backend/db/create_notifications_table.sql" 
      });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get unread notification count
router.get("/unread/count", requireAuth(), async (req, res) => {
  try {
    const { userId } = req.auth;

    // Count unread notifications (only send_req type for friend requests)
    const result = await pool.query(
      `SELECT COUNT(*) FROM motifications WHERE reciever = $1 AND type = 'send_req'`,
      [userId]
    );

    const count = parseInt(result.rows[0].count);

    res.status(200).json({ count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: "Notifications table does not exist. Please run the SQL script: backend/db/create_notifications_table.sql",
        count: 0
      });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

