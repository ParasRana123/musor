import pool from "../../backend/db/dbconnection.js";

export default async function streamVideo(video, roomId, userId) {
    try {
        const res = await pool.query(
            `INSERT INTO video (video, roomId, userId)
            VALUES ($1, $2, $3)
            RETURNING *;`,
            [video, parseInt(roomId), userId]
        );
        return res;
    } catch (error) {
        console.error("Error streaming video:", error);
        // If video table doesn't exist, just return null (non-blocking)
        if (error.code === '42P01') {
            console.log("Video table does not exist, skipping database save");
            return null;
        }
        throw error;
    }
}