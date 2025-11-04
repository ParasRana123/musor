import { WebSocketServer } from "ws";
import findUser from "./utils/findUsers";
import streamVideo from "./utils/streamVideo";

const wss = new WebSocketServer({ port: 8080 });

let allUsers = [];

wss.on('connection', function connection(ws) {
    console.log("User connected");

    ws.on("message" , async (msg) => {
        const user = findUser(allUsers , ws);
        console.log("msg recieved" , msg.toString());
        const parsedMessage = JSON.parse(msg);
        if(parsedMessage.type === "join_room") {
            allSockets.push({
                ws: ws,
                userId: parsedMessage.payload.userId,
                rooms: []
            })
        }

        if(parsedMessage.type === "stream") {
            const video = parsedMessage.video;
            const roomId = parsedMessage.roomId;
            console.log("User Id" , user.userId);
            console.log("video" , video);
            console.log("room" , roomId);
            if(!user.userId) {
                console.log('userid')
                return null;
            }
            const res = await streamVideo(video , roomId , user.userId);
            allUsers.forEach((user) => {
                if(user.roomId.includes(parsedMessage.roomId)) {
                    user.ws.send(
                        JSON.stringify({
                            type: "stream",
                            video: `${video}`,
                            roomId,
                        })
                    );
                } else {
                    console.log("error");
                }
            });
        }
    })
  ws.send('something');
});