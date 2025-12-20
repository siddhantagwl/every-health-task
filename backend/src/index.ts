import express from "express";
import cors from "cors";

import { db, initializeDB } from "./db/db";
import { insertTestLog, countLogs } from "./logs";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/hello", (req, res) => {
    res.json({ hello: true });
});

app.get("/db-check", (req, res) => {
    insertTestLog();
    const total = countLogs();
    res.json({ success: true, total });
});


const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

initializeDB();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} ...`);
});
