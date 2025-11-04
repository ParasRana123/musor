import pool from "../db/dbconnection.js";
import express from 'express' 
import jwt from 'jsonwebtoken'; 
import dotenv from 'dotenv'
dotenv.config()
const router=express.Router()
// Example: SELECT query
async function getUsers(req,res) {
  try {
    const result = await pool.query("SELECT * FROM users;");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({error:"Internal server error"});
  }
}
async function register(req,res){
  const {username,email,password}=req.body  
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  } 
  try {
    await pool.query("INSERT INTO users (username,email,password) VALUES ($1,$2,$3)",[username,email,password]);
    const token=jwt.sign({username,email},process.env.SECRET_KEY,{expiresIn:"24h"});
    res.cookie("token",token,{
      httpOnly:true,
      secure:false,
      sameSite:"lax",
      maxAge:24*60*60*1000
    })
    res.status(200).json({message:"User registered successfully",token:token});
  } catch (err) { 
    if (err.code==="23505"){
      return res.status(409).json({error:"User already exists"});
    }
    res.status(500).json({error:err});
  }
}
async function login(req,res){ 
  if (!req.body){
    return res.status(400).json({ error: "Nothing is sent" });
  }
  const {email,password}=req.body
  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  } 
  console.log(email,password)
  try{
    const response = await pool.query("SELECT * FROM users WHERE email=$1",[email]); 
    console.log(response.rows)
    if (response.rows.length===0) {
      return res.status(401).json({error:"Invalid email or password"});
    }
    const user=response.rows[0];
    console.log(user,password)
    if (user.password!==password) {
      return res.status(401).json({error:"Invalid email or password"});
    }
    const username=user.username
    const token=jwt.sign({username,email},process.env.SECRET_KEY,{expiresIn:"24h"});
    res.cookie("token",token,{
      httpOnly:true,
      secure:false,
      sameSite:"lax",
      maxAge:24*60*60*1000
    })
    res.status(200).json({message:"User logged in successfully",token:token});
  }
  catch (err) { 
    console.log(err)
    res.status(500).json({error:err});
  }
}
router.get("/", getUsers)
router.post("/register", register)
router.post("/login", login)
export default router;
