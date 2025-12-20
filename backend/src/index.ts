import express from "express";
import cors from "cors";

import { db, initializeDB } from "./db/db";
import { insertTestLog, countLogs, listLogs } from "./logs";

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

app.get("/logs", (req, res) => {
    const limitRaw = req.query.limit;

    const DEFAULT_LIMIT = 50;
    let limit = DEFAULT_LIMIT;

    if (typeof limitRaw === "string") {
        const parsed = Number(limitRaw);
        const isValid = Number.isInteger(parsed) && parsed > 0;

        if (!isValid) {
        return res.status(400).json({
            error: "Invalid limit. Use a positive integer.",
        });
        }

        limit = parsed;
    } else if (limitRaw !== undefined) {
        return res.status(400).json({error: "Invalid limit format."});
    }

    const rows = listLogs(limit);

    return res.json({
        logs: rows,
        countt: rows.length,
        limit,
    });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

initializeDB();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} ...`);
});
