import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",         
  host: "localhost",        
  database: "your_db_name", 
  password: "your_password",
  port: 5432,
});

export async function insertRecord(sender , reciever , type) {
    const client = await pool.connect();
    try {
        const query = `INSERT INTO motifications (sender , reciever , type) VALUES ($1 , $2 , $3) RETURNING *`;
        const values = [sender, reciever, type];
        const result = await client.query(query, values);
        console.log("Record inserted:", result.rows[0]);
        return result.rows[0];
    } catch(err) {
        console.error("Error inserting record:", err.message);
        throw err;
    } finally {
        client.release();
    }
}