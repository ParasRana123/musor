import express from "express";  
import pool from "../db/dbconnection.js";
import { requireAuth } from "@clerk/express";
const router=express.Router()
async function getPlaylist(req,res){
    try {
        const {userId} = req.auth;
        const user = await pool.query("SELECT * FROM users WHERE clerk_user_id = $1", [userId])
        if(user.rows.length === 0){
            return res.status(404).json({error:"User not found"})
        }
        const playlist=await pool.query("SELECT * FROM music WHERE clerk_user_id = $1 AND isfav = true", [userId])
        return res.status(200).json({playlist:playlist.rows})
    } catch (error) {
        res.status(500).json({error:"Internal server error"})
    }
}
router.get("/", requireAuth(), getPlaylist) 


export default router;