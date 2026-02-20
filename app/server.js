import express from "express";
import pg from "pg";

const app = express();
app.use(express.json());

const { Pool } = pg;

// Wir nutzen DATABASE_URL aus docker-compose
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// DB Tabelle anlegen, falls noch nicht vorhanden
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
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
    const result = await pool.query(
      "SELECT id, name, message, created_at FROM messages ORDER BY id DESC LIMIT 50"
    );
    res.json(result.rows);
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

    const result = await pool.query(
      "INSERT INTO messages(name, message) VALUES($1, $2) RETURNING id, created_at",
      [name, message]
    );

    res.json({ ok: true, id: result.rows[0].id, created_at: result.rows[0].created_at });
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
