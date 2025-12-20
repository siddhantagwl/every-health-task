import express from "express";
import cors from "cors";

import { db, initializeDB } from "./db/db";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/hello", (req, res) => {
    res.json({ hello: true });
});

app.get("/db-check", (req, res) => {
    const now = new Date().toISOString();
    const insert = db.prepare(`
        INSERT INTO logs (timestamp, source, severity, message, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    insert.run(now, "demo", "info", "SQLite test", now);
    const row = db.prepare(`SELECT COUNT(*) as count FROM logs`).get() as { count: number };
    res.json({ success: true, total: row.count });
});


const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

initializeDB();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} ...`);
});
