import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",         
  host: "localhost",        
  database: "your_db_name", 
  password: "your_password",
  port: 5432,
});

export async function getNotifications(userId) {
    const client = await pool.connect();
    try {
        // Get all notifications where user is the receiver
        const query = `SELECT * FROM motifications WHERE reciever = $1 ORDER BY created_at DESC`;
        const result = await client.query(query, [userId]);
        return result.rows;
    } catch(err) {
        console.error("Error getting notifications:", err.message);
        throw err;
    } finally {
        client.release();
    }
}

