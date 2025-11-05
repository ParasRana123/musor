import express from "express";

import cors from "cors";
import { clerkClient , requireAuth } from "@clerk/express";
import dotenv from 'dotenv'
dotenv.config()

const app = express()
app.use(express.json())
app.use(cors(
    {
        origin: ["http://localhost:5173", "http://localhost:8080","http://192.168.137.157:5173","https://musor-ten.vercel.app"],
        credentials: true,
    }
)) 
app.options('*', cors({
  origin: ["http://localhost:5173", "https://musor-ten.vercel.app"],
  credentials: true
}));

app.get("/protected", requireAuth(), (req, res) => {
  res.json({ message: "Hello, " + req.auth.userId });
});

app.get("/me", requireAuth(), async (req, res) => { 
  const { userId } = req.auth; 
  const user = await clerkClient.users.getUser(userId);
  res.json(user);
}); 

import sync from '../routes/auth.clerk.js' 
app.use('/api/sync',sync) 
 
import getall from '../routes/getall.js'
app.use('/getall',getall) 


const PORT=process.env.PORT || 5000 

import deleteall from '../routes/deleteall.js'
app.use('/deleteall',deleteall) 

import getsongs from '../routes/getsongs.js'
app.use('/getsongs',getsongs)

import store from '../routes/store.js'
app.use('/music',store)

import playlist from '../routes/playlist.js'
app.use('/playlist',playlist)

import friends from '../routes/friends.js'
app.use('/friends',friends)

import notifications from '../routes/notifications.js'
app.use('/notifications',notifications)


// app.get('/', (req, res) => {
//   res.json({ status: 'OK', message: 'API running' });
// });



app.listen(PORT,()=>console.log(`Server running on port ${PORT}`))
