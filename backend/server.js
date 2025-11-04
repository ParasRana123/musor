import express from "express";

import dotenv from 'dotenv'
dotenv.config()

const app = express()
app.use(express.json())
const PORT=process.env.PORT || 5000 

import auth from './routes/auth.js'
import deleteall from './routes/deleteall.js'
app.use('/auth',auth)
app.use('/deleteall',deleteall)
app.get('/',(req,res)=>{
    res.send("Welcome to the Musor API")
})
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`))
