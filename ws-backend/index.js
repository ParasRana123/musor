import { WebSocketServer } from "ws";
import findUser from "./utils/findUsers.js";
import streamVideo from "./utils/streamVideo.js";

const wss = new WebSocketServer({ port: 8080 });

let allUsers = [];
// Store room state: { roomId: { video: string, currentTime: number, isPlaying: boolean } }
let roomStates = {};

wss.on('connection', function connection(ws) {
    console.log("User connected");

    ws.on("message" , async (msg) => {
        const user = findUser(allUsers , ws);
        console.log("msg recieved" , msg.toString());
        const parsedMessage = JSON.parse(msg);
        
        if(parsedMessage.type === "join_room") {
            const existingUser = findUser(allUsers, ws);
            const roomId = parsedMessage.payload.roomId;
            
            if (existingUser) {
                // User already exists, add room
                if (!existingUser.rooms.includes(roomId)) {
                    existingUser.rooms.push(roomId);
                }
            } else {
                // New user
                allUsers.push({
                    ws: ws,
                    userId: parsedMessage.payload.userId,
                    rooms: [roomId]
                });
            }
            
            // Send current room state to newly joined user
            if (roomStates[roomId]) {
                const video = roomStates[roomId].video;
                // Extract video ID
                let videoId = video;
                const videoIdMatch = video.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/);
                if (videoIdMatch && videoIdMatch[1]) {
                    videoId = videoIdMatch[1];
                }
                
                console.log(`Sending sync to new user in room ${roomId}: video ${videoId}`);
                
                ws.send(JSON.stringify({
                    type: "sync",
                    roomId: roomId,
                    video: video,
                    videoId: videoId,
                    currentTime: roomStates[roomId].currentTime || 0,
                    isPlaying: roomStates[roomId].isPlaying || false
                }));
            }
            
            console.log(`User ${parsedMessage.payload.userId} joined room ${roomId}`);
        }

        if(parsedMessage.type === "stream") {
            const video = parsedMessage.video;
            const roomId = parsedMessage.roomId;
            const currentTime = parsedMessage.currentTime || 0;
            const currentUser = findUser(allUsers, ws);
            
            console.log("User Id" , currentUser?.userId);
            console.log("video" , video);
            console.log("room" , roomId);
            
            if(!currentUser || !currentUser.userId) {
                console.log('User not found or no userId');
                return null;
            }
            
            // Update room state
            roomStates[roomId] = {
                video: video,
                currentTime: currentTime,
                isPlaying: true
            };
            
            // Save video to database (optional)
            try {
                await streamVideo(video, roomId, currentUser.userId);
            } catch (error) {
                console.error("Error saving video:", error);
            }
            
            // Extract video ID from embed URL for better compatibility
            let videoId = video;
            // If it's an embed URL, extract the video ID
            const videoIdMatch = video.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/);
            if (videoIdMatch && videoIdMatch[1]) {
                videoId = videoIdMatch[1];
            }
            
            console.log(`Broadcasting video ${videoId} to room ${roomId} at time ${currentTime}`);
            
            // Broadcast to all users in the room (including sender so they all see the same video)
            allUsers.forEach((user) => {
                if(user.rooms && user.rooms.includes(roomId)) {
                    try {
                        user.ws.send(
                            JSON.stringify({
                                type: "stream",
                                video: video, // Send full URL
                                videoId: videoId, // Also send extracted ID
                                roomId,
                                currentTime: currentTime,
                                isPlaying: true
                            })
                        );
                    } catch (e) {
                        console.error("Error sending stream to user:", e);
                    }
                }
            });
        }

        if(parsedMessage.type === "play") {
            const roomId = parsedMessage.roomId;
            const currentTime = parsedMessage.currentTime || 0;
            
            // Update room state
            if (roomStates[roomId]) {
                roomStates[roomId].isPlaying = true;
                roomStates[roomId].currentTime = currentTime;
            }
            
            console.log(`Broadcasting play to room ${roomId} at time ${currentTime}`);
            
            // Broadcast play event to ALL users in the room (except sender)
            const currentUser = findUser(allUsers, ws);
            allUsers.forEach((user) => {
                if(user.rooms && user.rooms.includes(roomId) && user.ws !== ws) {
                    try {
                        user.ws.send(
                            JSON.stringify({
                                type: "play",
                                roomId,
                                currentTime: currentTime
                            })
                        );
                    } catch (e) {
                        console.error("Error sending play to user:", e);
                    }
                }
            });
        }

        if(parsedMessage.type === "pause") {
            const roomId = parsedMessage.roomId;
            const currentTime = parsedMessage.currentTime || 0;
            
            // Update room state
            if (roomStates[roomId]) {
                roomStates[roomId].isPlaying = false;
                roomStates[roomId].currentTime = currentTime;
            }
            
            console.log(`Broadcasting pause to room ${roomId} at time ${currentTime}`);
            
            // Broadcast pause event to ALL users in the room (except sender)
            // This is critical - when one pauses, ALL must pause
            const currentUser = findUser(allUsers, ws);
            allUsers.forEach((user) => {
                if(user.rooms && user.rooms.includes(roomId) && user.ws !== ws) {
                    try {
                        user.ws.send(
                            JSON.stringify({
                                type: "pause",
                                roomId,
                                currentTime: currentTime
                            })
                        );
                    } catch (e) {
                        console.error("Error sending pause to user:", e);
                    }
                }
            });
        }

        if(parsedMessage.type === "seek") {
            const roomId = parsedMessage.roomId;
            const currentTime = parsedMessage.currentTime || 0;
            
            // Update room state
            if (roomStates[roomId]) {
                roomStates[roomId].currentTime = currentTime;
            }
            
            // Broadcast seek event to all users in the room
            allUsers.forEach((user) => {
                if(user.rooms && user.rooms.includes(roomId)) {
                    user.ws.send(
                        JSON.stringify({
                            type: "seek",
                            roomId,
                            currentTime: currentTime
                        })
                    );
                }
            });
        }

        if(parsedMessage.type === "time_sync") {
            const roomId = parsedMessage.roomId;
            const currentTime = parsedMessage.currentTime || 0;
            
            // Update room state with latest time
            if (roomStates[roomId]) {
                roomStates[roomId].currentTime = currentTime;
            }
            
            // Broadcast time sync to all other users in the room (except sender)
            // This keeps all videos aligned
            allUsers.forEach((user) => {
                if(user.rooms && user.rooms.includes(roomId) && user.ws !== ws) {
                    try {
                        user.ws.send(
                            JSON.stringify({
                                type: "time_sync",
                                roomId,
                                currentTime: currentTime
                            })
                        );
                    } catch (e) {
                        console.error("Error sending time sync:", e);
                    }
                }
            });
        }
    });

    ws.on('close', () => {
        // Remove user when they disconnect
        allUsers = allUsers.filter(user => user.ws !== ws);
        console.log("User disconnected");
    });

    ws.send('connected');
});