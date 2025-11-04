import pool from "../db/dbconnection.js"; 
import express from 'express'
const router=express.Router()
router.delete("/",async (req,res)=>{
    try {
        await pool.query("DELETE FROM users;")
        res.status(200).json({message:"All users deleted successfully"})
    } catch (err) {
        res.status(500).json({error:"Internal server error"})
    }
})
export default router
