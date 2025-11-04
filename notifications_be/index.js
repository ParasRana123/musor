import express from "express";
import { insertRecord } from "./dbquery/insert";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/send-request" , async (req , res) => {
    try {
        const { sender , reciever } = req.body;
        if(!sender || !reciever) {
            res.status(400).json({ error: "sender or reciever required" });
        }
        const record = await insertRecord(sender , reciever , "send_req");
        return res.status(200).json({
            message: "Friend req sent successfully",
            data: record,   
        }); 
    } catch(err) {
        console.error("Error sending request:", err.message);
        return res.status(500).json({ error: "server error" });
    }
})

app.post("/respond-request" , async (req , res) => {
    try {
        const { sender , reciever , response } = req.body;
        if(!sender || !reciever || !response) {
            return res.status(400).json({ error: "sender, receiver, and response required" });
        }
        if(!["accept" , "reject"].includes(response)) {
            return res.status(400).json({ error: "response must be accept or reject" });
        }
        const record = await insertRecord(sender , reciever , response);
        return res.status(200).json({
            message: "response sent",
            data: record
        })
    } catch(err) {
        res.status(400).json({ message: err.message });
    }
})

app.listen(3002 , () => {
    console.log("On port: " , 3002);
})