export default async function streamVideo(video , roomId , userId) {
    const res = await pool.query(
        `INSERT INTO video (video, roomId, userId)
        VALUES ('${video}', ${parseInt(roomId)}, ${userId})
        RETURNING *;`
    );

    return res;
}