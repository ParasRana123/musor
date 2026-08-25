import { WebSocketServer } from "ws";
import findUser from "./utils/findUsers.js";
import dotenv from "dotenv";
dotenv.config();

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });

let allUsers = [];
// Store room state: { roomId: { video: string, currentTime: number, isPlaying: boolean } }
let roomStates = {};
let roomQueues = {};

function playNextFromQueue(roomId) {
    if (!roomQueues[roomId] || roomQueues[roomId].length === 0) {
        console.log("Room Queue empty:", roomId);
        roomStates[roomId] = null;
        return;
    }
    const nextVideo = roomQueues[roomId].shift();
    roomStates[roomId] = {
        video: nextVideo.url,
        currentTime: 0,
        isPlaying: true
    };
    console.log("Playing from Queue:", nextVideo.title);

    allUsers.forEach((user) => {
        if (user.rooms && user.rooms.includes(roomId)) {
            try {
                if (user.ws.readyState === 1) {
                    user.ws.send(JSON.stringify({
                        type: "stream",
                        roomId,
                        video: nextVideo.url,
                        videoId: nextVideo.videoId,
                        currentTime: 0,
                        isPlaying: true
                    }));
                }
            } catch (e) {
                console.error("Error sending stream to user:", e);
            }
        }
    });

    allUsers = allUsers.filter((user) => {
        try {
            if (user.ws.readyState === 1) {
                if (user.rooms && user.rooms.includes(roomId)) {
                    user.ws.send(JSON.stringify({
                        type: "queue_update",
                        roomId,
                        queue: roomQueues[roomId]
                    }));
                }
                return true;
            }
        } catch (e) {
            console.log("Removing dead socket");
        }
        return false;
    });
}

wss.on('connection', function connection(ws) {
    console.log("User connected");

    ws.on('error', (err) => {
        console.error("WebSocket client error:", err.message);
    });

    ws.on("message", async (msg) => {
        try {
            const rawMsg = msg.toString();
            if (!rawMsg || !rawMsg.trim().startsWith('{')) {
                return;
            }
            const parsedMessage = JSON.parse(rawMsg);
            console.log("Message received:", parsedMessage.type);

            if (parsedMessage.type === "join_room") {
                const roomId = parsedMessage.payload?.roomId;
                const userId = parsedMessage.payload?.userId;
                if (!roomId) return;

                const existingUser = findUser(allUsers, ws);
                if (existingUser) {
                    if (userId) existingUser.userId = userId;
                    if (!existingUser.rooms.includes(roomId)) {
                        existingUser.rooms.push(roomId);
                    }
                } else {
                    allUsers.push({
                        ws: ws,
                        userId: userId,
                        rooms: [roomId]
                    });
                }

                // Send current room state to newly joined user
                if (roomStates[roomId]) {
                    const video = roomStates[roomId].video;
                    let videoId = video;
                    const videoIdMatch = video.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/);
                    if (videoIdMatch && videoIdMatch[1]) {
                        videoId = videoIdMatch[1];
                    }

                    console.log(`Sending sync to new user in room ${roomId}: video ${videoId}`);

                    try {
                        if (ws.readyState === 1) {
                            ws.send(JSON.stringify({
                                type: "sync",
                                roomId: roomId,
                                video: video,
                                videoId: videoId,
                                currentTime: roomStates[roomId].currentTime || 0,
                                isPlaying: roomStates[roomId].isPlaying || false
                            }));
                        }
                    } catch (err) {
                        console.error("Error sending sync to user:", err);
                    }
                }

                // Send current queue to newly joined user
                if (roomQueues[roomId] && roomQueues[roomId].length > 0) {
                    try {
                        if (ws.readyState === 1) {
                            ws.send(JSON.stringify({
                                type: "queue_update",
                                roomId: roomId,
                                queue: roomQueues[roomId]
                            }));
                        }
                    } catch (err) {
                        console.error("Error sending queue to user:", err);
                    }
                }

                console.log(`User ${userId} joined room ${roomId}`);
            }

            if (parsedMessage.type === "stream") {
                const video = parsedMessage.video;
                const roomId = parsedMessage.roomId;
                const currentTime = parsedMessage.currentTime || 0;
                const currentUser = findUser(allUsers, ws);

                if (!currentUser || !currentUser.userId) {
                    console.log('User not found or no userId');
                    return null;
                }

                roomStates[roomId] = {
                    video: video,
                    currentTime: currentTime,
                    isPlaying: true
                };

                let videoId = video;
                const videoIdMatch = video.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/);
                if (videoIdMatch && videoIdMatch[1]) {
                    videoId = videoIdMatch[1];
                }

                console.log(`Broadcasting video ${videoId} to room ${roomId} at time ${currentTime}`);

                allUsers.forEach((user) => {
                    if (user.rooms && user.rooms.includes(roomId)) {
                        try {
                            if (user.ws.readyState === 1) {
                                user.ws.send(
                                    JSON.stringify({
                                        type: "stream",
                                        video: video,
                                        videoId: videoId,
                                        roomId,
                                        currentTime: currentTime,
                                        isPlaying: true
                                    })
                                );
                            }
                        } catch (e) {
                            console.error("Error sending stream to user:", e);
                        }
                    }
                });
            }

            if (parsedMessage.type === "add_to_queue") {
                console.log("Inside queue adding");
                const { roomId, video } = parsedMessage;
                if (!roomQueues[roomId]) {
                    roomQueues[roomId] = [];
                }
                roomQueues[roomId].push(video);
                console.log(`Added video to the queue: ${roomId}`, video.title);

                allUsers.forEach((user) => {
                    if (user.rooms && user.rooms.includes(roomId)) {
                        try {
                            if (user.ws.readyState === 1) {
                                user.ws.send(JSON.stringify({
                                    type: 'queue_update',
                                    roomId,
                                    queue: roomQueues[roomId]
                                }));
                            }
                        } catch (e) {
                            console.error("Error sending queue update:", e);
                        }
                    }
                });

                if (!roomStates[roomId]) {
                    playNextFromQueue(roomId);
                }
            }

            if (parsedMessage.type === "video_ended") {
                const { roomId } = parsedMessage;
                console.log("Video ended:", roomId);
                playNextFromQueue(roomId);
            }

            if (parsedMessage.type === "play") {
                const roomId = parsedMessage.roomId;
                const currentTime = parsedMessage.currentTime || 0;

                if (roomStates[roomId]) {
                    roomStates[roomId].isPlaying = true;
                    roomStates[roomId].currentTime = currentTime;
                }

                console.log(`Broadcasting play to room ${roomId} at time ${currentTime}`);

                allUsers.forEach((user) => {
                    if (user.rooms && user.rooms.includes(roomId) && user.ws !== ws) {
                        try {
                            if (user.ws.readyState === 1) {
                                user.ws.send(
                                    JSON.stringify({
                                        type: "play",
                                        roomId,
                                        currentTime: currentTime
                                    })
                                );
                            }
                        } catch (e) {
                            console.error("Error sending play to user:", e);
                        }
                    }
                });
            }

            if (parsedMessage.type === "pause") {
                const roomId = parsedMessage.roomId;
                const currentTime = parsedMessage.currentTime || 0;

                if (roomStates[roomId]) {
                    roomStates[roomId].isPlaying = false;
                    roomStates[roomId].currentTime = currentTime;
                }

                console.log(`Broadcasting pause to room ${roomId} at time ${currentTime}`);

                allUsers.forEach((user) => {
                    if (user.rooms && user.rooms.includes(roomId) && user.ws !== ws) {
                        try {
                            if (user.ws.readyState === 1) {
                                user.ws.send(
                                    JSON.stringify({
                                        type: "pause",
                                        roomId,
                                        currentTime: currentTime
                                    })
                                );
                            }
                        } catch (e) {
                            console.error("Error sending pause to user:", e);
                        }
                    }
                });
            }

            if (parsedMessage.type === "seek") {
                const roomId = parsedMessage.roomId;
                const currentTime = parsedMessage.currentTime || 0;

                if (roomStates[roomId]) {
                    roomStates[roomId].currentTime = currentTime;
                }

                allUsers.forEach((user) => {
                    if (user.rooms && user.rooms.includes(roomId)) {
                        try {
                            if (user.ws.readyState === 1) {
                                user.ws.send(
                                    JSON.stringify({
                                        type: "seek",
                                        roomId,
                                        currentTime: currentTime
                                    })
                                );
                            }
                        } catch (e) {
                            console.error("Error sending seek to user:", e);
                        }
                    }
                });
            }

            if (parsedMessage.type === "time_sync") {
                const roomId = parsedMessage.roomId;
                const currentTime = parsedMessage.currentTime || 0;

                if (roomStates[roomId]) {
                    roomStates[roomId].currentTime = currentTime;
                }

                allUsers.forEach((user) => {
                    if (user.rooms && user.rooms.includes(roomId) && user.ws !== ws) {
                        try {
                            if (user.ws.readyState === 1) {
                                user.ws.send(
                                    JSON.stringify({
                                        type: "time_sync",
                                        roomId,
                                        currentTime: currentTime
                                    })
                                );
                            }
                        } catch (e) {
                            console.error("Error sending time sync:", e);
                        }
                    }
                });
            }

            if (parsedMessage.type === "chat") {
                const chat = parsedMessage.chat;
                const roomId = parsedMessage.roomId;
                const currentUser = findUser(allUsers, ws);

                if (!currentUser || !currentUser.userId) {
                    console.log("User not found");
                    return null;
                }

                allUsers.forEach((user) => {
                    if (user.rooms && user.rooms.includes(roomId)) {
                        try {
                            if (user.ws.readyState === 1) {
                                user.ws.send(
                                    JSON.stringify({
                                        type: "chat",
                                        chat: chat,
                                        roomId,
                                        senderId: currentUser.userId
                                    })
                                );
                            }
                        } catch (e) {
                            console.error("Error sending chat to user:", e);
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Error handling message:", error);
        }
    });

    ws.on('close', () => {
        allUsers = allUsers.filter((user) => user.ws !== ws);
        console.log("User disconnected");
    });

    try {
        if (ws.readyState === 1) {
            ws.send('connected');
        }
    } catch (err) {
        console.error("Error sending initial connected message:", err);
    }
});