import express from "express";

import cors from "cors";
import { clerkClient , requireAuth } from "@clerk/express";
import dotenv from 'dotenv'
dotenv.config()

const app = express()
app.use(express.json())
app.use(cors(
    {
        origin: "http://localhost:5173",
        credentials: true,
    }
))
app.get("/protected", requireAuth(), (req, res) => {
  res.json({ message: "Hello, " + req.auth.userId });
});

app.get("/me", requireAuth(), async (req, res) => { 
  const { userId } = req.auth; 
  const user = await clerkClient.users.getUser(userId);
  res.json(user);
}); 

import sync from './routes/auth.clerk.js' 
app.use('/api/sync',sync) 
 
import getall from './routes/getall.js'
app.use('/getall',getall) 


const PORT=process.env.PORT || 5000 

import deleteall from './routes/deleteall.js'
app.use('/deleteall',deleteall) 


import store from './routes/store.js'
app.use('/music',store)

// app.get('/', (req, res) => {
//   res.json({ status: 'OK', message: 'API running' });
// });



app.listen(PORT,()=>console.log(`Server running on port ${PORT}`))
