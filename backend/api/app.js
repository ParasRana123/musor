import express from "express";
import cors from "cors";
import { requireAuth } from "@clerk/express";
import dotenv from "dotenv";
import pool from "../db/dbconnection.js";
import { clerkClient } from "@clerk/clerk-sdk-node";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://musor-ten.vercel.app", // frontend in production
];

// app.use(
//   cors({
//     origin: allowedOrigins,
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:8080",
        "https://musor-ten.vercel.app", // production frontend
      ];

      // allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// app.options("*", cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});


// --- Clerk-protected routes ---
app.get("/protected", requireAuth(), (req, res) => {
  res.json({ message: "Hello, " + req.auth.userId });
});

app.get("/me", requireAuth(), async (req, res) => {
  const { userId } = req.auth;
  const user = await clerkClient.users.getUser(userId);
  res.json(user);
});

// --- Your routes ---
import sync from "../routes/auth.clerk.js";
app.use("/api/sync", sync);

import getall from "../routes/getall.js";
app.use("/getall", getall);

import deleteall from "../routes/deleteall.js";
app.use("/deleteall", deleteall);

import getsongs from "../routes/getsongs.js";
app.use("/getsongs", getsongs);

import store from "../routes/store.js";
app.use("/music", store);

import playlist from "../routes/playlist.js";
app.use("/playlist", playlist);

import friends from "../routes/friends.js";
app.use("/friends", friends);

import notifications from "../routes/notifications.js";
import { use } from "react";
app.use("/notifications", notifications);

// Optional test route
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "API running" });
});

app.get("/user/:id" , async (req , res) => {
  try {
    const { id } = req.params;
    const user = await pool.query("SELECT * FROM users WHERE clerk_user_id = $1" , [id]);
    if(user.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }
    const clerkUser = await clerkClient.users.getUser(id);
    const mergedUser = {
      ...user.rows[0],
      imageUrl: clerkUser.imageUrl,
      username: clerkUser.username || clerkUser.firstName || "Music Lover",
      email: clerkUser.primaryEmailAddress?.emailAddress
    };
    res.json({ user: mergedUser });
  } catch(e) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ message: "Server error" });
  }
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
