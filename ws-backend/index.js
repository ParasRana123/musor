import { WebSocketServer } from "ws";
import findUser from "./utils/findUsers.js";
import dotenv from "dotenv";
dotenv.config();

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });

let allUsers = [];
let roomStates = {};
let roomQueues = {};

// ✅ FIX: Safe broadcast helper — never reassigns allUsers, never removes users mid-flow.
// Sends to all users in a room, optionally skipping one (e.g. the sender).
function broadcastToRoom(roomId, payload, excludeWs = null) {
    allUsers.forEach((user) => {
        if (
            user.rooms &&
            user.rooms.includes(roomId) &&
            user.ws !== excludeWs &&
            user.ws.readyState === 1  // WebSocket.OPEN
        ) {
            try {
                user.ws.send(JSON.stringify(payload));
            } catch (e) {
                console.error("Error broadcasting to user:", e);
            }
        }
    });
}

// ✅ FIX: Dead socket cleanup is now a separate, deliberate operation — never mixed
// into message broadcasting. Call this periodically or on 'close'.
function cleanupDeadSockets() {
    allUsers = allUsers.filter((user) => user.ws.readyState === 1);
}

function playNextFromQueue(roomId) {
    if (!roomQueues[roomId] || roomQueues[roomId].length === 0) {
        console.log("Room queue empty:", roomId);
        roomStates[roomId] = null;
        return;
    }

    const nextVideo = roomQueues[roomId].shift(); // remove from queue first

    roomStates[roomId] = {
        video: nextVideo.url,
        currentTime: 0,
        isPlaying: true,
    };

    console.log("Playing from queue:", nextVideo.title);

    // ✅ FIX: Use broadcastToRoom — no allUsers mutation, no filter bug.
    // Send the new video to everyone in the room.
    broadcastToRoom(roomId, {
        type: "stream",
        roomId,
        video: nextVideo.url,
        videoId: nextVideo.videoId,
        currentTime: 0,
        isPlaying: true,
    });

    // Send updated queue (now one item shorter) to everyone.
    broadcastToRoom(roomId, {
        type: "queue_update",
        roomId,
        queue: roomQueues[roomId],
    });
}

wss.on("connection", function connection(ws) {
    console.log("User connected");

    ws.on("message", async (msg) => {
        const parsedMessage = JSON.parse(msg);
        console.log("Message received:", parsedMessage.type);

        // ─── JOIN ROOM ────────────────────────────────────────────────────────
        if (parsedMessage.type === "join_room") {
            const roomId = parsedMessage.payload.roomId;
            const existingUser = findUser(allUsers, ws);

            if (existingUser) {
                if (!existingUser.rooms.includes(roomId)) {
                    existingUser.rooms.push(roomId);
                }
            } else {
                allUsers.push({
                    ws,
                    userId: parsedMessage.payload.userId,
                    rooms: [roomId],
                });
            }

            // Send current room state (video + time) to the newly joined user.
            if (roomStates[roomId]) {
                const video = roomStates[roomId].video;
                let videoId = video;
                const match = video.match(
                    /(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/
                );
                if (match && match[1]) videoId = match[1];

                ws.send(
                    JSON.stringify({
                        type: "sync",
                        roomId,
                        video,
                        videoId,
                        currentTime: roomStates[roomId].currentTime || 0,
                        isPlaying: roomStates[roomId].isPlaying || false,
                    })
                );
            }

            // Send the current queue to the newly joined user.
            if (roomQueues[roomId] && roomQueues[roomId].length > 0) {
                ws.send(
                    JSON.stringify({
                        type: "queue_update",
                        roomId,
                        queue: roomQueues[roomId],
                    })
                );
            }

            console.log(`User ${parsedMessage.payload.userId} joined room ${roomId}`);
        }

        // ─── STREAM VIDEO ─────────────────────────────────────────────────────
        if (parsedMessage.type === "stream") {
            const { video, roomId, currentTime = 0 } = parsedMessage;
            const currentUser = findUser(allUsers, ws);

            if (!currentUser?.userId) {
                console.log("Stream rejected: user not found");
                return;
            }

            roomStates[roomId] = { video, currentTime, isPlaying: true };

            let videoId = video;
            const match = video.match(
                /(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/
            );
            if (match && match[1]) videoId = match[1];

            broadcastToRoom(roomId, {
                type: "stream",
                video,
                videoId,
                roomId,
                currentTime,
                isPlaying: true,
            });
        }

        // ─── ADD TO QUEUE ─────────────────────────────────────────────────────
        if (parsedMessage.type === "add_to_queue") {
            const { roomId, video } = parsedMessage;

            if (!roomQueues[roomId]) roomQueues[roomId] = [];
            roomQueues[roomId].push(video);
            console.log(`Added to queue in room ${roomId}:`, video.title);

            // ✅ FIX: Broadcast queue_update BEFORE potentially calling
            // playNextFromQueue, so clients always see the populated queue
            // before it might get shifted. No double-broadcast race condition.
            broadcastToRoom(roomId, {
                type: "queue_update",
                roomId,
                queue: roomQueues[roomId],
            });

            // If nothing is currently playing, start the queue immediately.
            // playNextFromQueue will shift the item and send a fresh queue_update
            // (showing the now-empty queue) plus the stream event.
            if (!roomStates[roomId]) {
                playNextFromQueue(roomId);
            }
        }

        // ─── VIDEO ENDED ──────────────────────────────────────────────────────
        if (parsedMessage.type === "video_ended") {
            const { roomId } = parsedMessage;
            console.log("Video ended in room:", roomId);
            playNextFromQueue(roomId);
        }

        // ─── PLAY ─────────────────────────────────────────────────────────────
        if (parsedMessage.type === "play") {
            const { roomId, currentTime = 0 } = parsedMessage;
            if (roomStates[roomId]) {
                roomStates[roomId].isPlaying = true;
                roomStates[roomId].currentTime = currentTime;
            }
            broadcastToRoom(roomId, { type: "play", roomId, currentTime }, ws);
        }

        // ─── PAUSE ────────────────────────────────────────────────────────────
        if (parsedMessage.type === "pause") {
            const { roomId, currentTime = 0 } = parsedMessage;
            if (roomStates[roomId]) {
                roomStates[roomId].isPlaying = false;
                roomStates[roomId].currentTime = currentTime;
            }
            broadcastToRoom(roomId, { type: "pause", roomId, currentTime }, ws);
        }

        // ─── SEEK ─────────────────────────────────────────────────────────────
        if (parsedMessage.type === "seek") {
            const { roomId, currentTime = 0 } = parsedMessage;
            if (roomStates[roomId]) roomStates[roomId].currentTime = currentTime;
            broadcastToRoom(roomId, { type: "seek", roomId, currentTime });
        }

        // ─── TIME SYNC ────────────────────────────────────────────────────────
        if (parsedMessage.type === "time_sync") {
            const { roomId, currentTime = 0 } = parsedMessage;
            if (roomStates[roomId]) roomStates[roomId].currentTime = currentTime;
            broadcastToRoom(roomId, { type: "time_sync", roomId, currentTime }, ws);
        }

        // ─── CHAT ─────────────────────────────────────────────────────────────
        if (parsedMessage.type === "chat") {
            const { chat, roomId } = parsedMessage;
            const currentUser = findUser(allUsers, ws);

            if (!currentUser?.userId) {
                console.log("Chat rejected: user not found");
                return;
            }

            broadcastToRoom(roomId, {
                type: "chat",
                chat,
                roomId,
                senderId: currentUser.userId,
            });
        }
    });

    ws.on("close", () => {
        // ✅ Safe: cleanup only runs on actual disconnect, never during message handling.
        cleanupDeadSockets();
        console.log("User disconnected");
    });

    ws.send("connected");
});