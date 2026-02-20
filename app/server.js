import express from "express";
import mysql from "mysql2/promise";

const app = express();
app.use(express.json());

// Wir nutzen DB_* Variablen aus docker-compose (MariaDB)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "db",
  port: parseInt(process.env.DB_PORT || "3306"),
  database: process.env.DB_NAME || "m347db",
  user: process.env.DB_USER || "m347user",
  password: process.env.DB_PASS || "m347pass",
  waitForConnections: true,
  connectionLimit: 10
});

// DB Tabelle anlegen, falls noch nicht vorhanden
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("DB init ok");
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Alle Messages holen
app.get("/api/messages", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, message, created_at FROM messages ORDER BY id DESC LIMIT 50"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// Neue Message speichern
app.post("/api/messages", async (req, res) => {
  try {
    const { name, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ error: "name und message sind Pflicht" });
    }

    const [result] = await pool.query(
      "INSERT INTO messages(name, message) VALUES(?, ?)",
      [name, message]
    );

    const [[row]] = await pool.query(
      "SELECT id, created_at FROM messages WHERE id = ?",
      [result.insertId]
    );

    res.json({ ok: true, id: row.id, created_at: row.created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

const PORT = 3000;

initDb()
  .then(() => app.listen(PORT, () => console.log("API läuft auf Port", PORT)))
  .catch((e) => {
    console.error("DB init failed", e);
    process.exit(1);
  });
