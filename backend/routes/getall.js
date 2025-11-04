import jwt from 'jsonwebtoken'; 
import dotenv from 'dotenv' 
dotenv.config()
import pool from "../db/dbconnection.js";
import express from 'express'
const router=express.Router()
async function getUsers(req,res) {
  try {
    const result = await pool.query("SELECT * FROM users;");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({error:"Internal server error"});
  }
} 
router.get("/", getUsers)

export default router
