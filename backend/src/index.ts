import express from "express";
import cors from "cors";

import { db, initializeDB } from "./db/db";
import { insertTestLog, countLogs, listLogsFiltered, getLogStatistics, insertLogsToDB, buildRowsForInsert } from "./logs";
import { isSeverity, type Severity } from "./severity";

const app = express();

app.use(cors());
app.use(express.json( {limit: "1mb"} )); // todo: awhat if large payloads ?

// ############## routes ##############

const MAX_LOGS_PER_INGEST = 10_000;


app.get("/logs", (req, res) => {
    const limitRaw = req.query.limit;

    console.log("Query params:", req.query); // debug

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

    // user params
    const severityRaw = req.query.severity;
    const fromRaw = req.query.from;
    const toRaw = req.query.to;

    // sanitize params
    let severity: Severity | undefined;

    if (typeof severityRaw === "string") {
        if (!isSeverity(severityRaw)) {
            return res.status(400).json({
                error: `Invalid severity. Allowed: debug, info, warning, error.`,
            });
        }

        severity = severityRaw;
    } else if (severityRaw !== undefined) {
        return res.status(400).json({ error: "Invalid severity format." });
    }

    // const severity = typeof severityRaw === "string" ? severityRaw : undefined;
    const from = typeof fromRaw === "string" ? fromRaw : undefined;
    const to = typeof toRaw === "string" ? toRaw : undefined;

    try {
        const rows = listLogsFiltered({ severity, from, to, limit });
        return res.json({ logs: rows, count: rows.length, limit });
    } catch (e) {
        return res.status(400).json({
            error: e instanceof Error ? e.message : "Invalid query parameters",
        });
    }
});

// todo: move this to a proper route file
app.get("/logs/stats", (req, res) => {
    const stats = getLogStatistics();
    res.json(stats);
});

app.post("/logs/ingest", (req, res) => {
    const logs = req.body?.logs;

    // validate body
    if (!Array.isArray(logs)) {
        return res.status(400).json({ error: "Body must be of following type { logs: [...] }" });
    }

    if (logs.length > MAX_LOGS_PER_INGEST) {
        return res.status(400).json({
            error: `Too many log entries. Max allowed is ${MAX_LOGS_PER_INGEST}.`,
        });
    }

    const { rows, errors } = buildRowsForInsert(logs);
    const inserted = insertLogsToDB(rows);

    // respond with summary, errors and inserted count
    return res.json({
        inserted: inserted,
        failed: errors.length,
        errors: errors,
    });
});

// ############# dummy routes for testing - to be ignored  ##############
// for testing purposes
app.get("/hello", (req, res) => {
    res.json({ hello: true });
});

// for testing purposes
app.get("/db-check", (req, res) => {
    insertTestLog();
    const total = countLogs();
    res.json({ success: true, total });
});

// for testing purposes
app.post("/logs/test-batch", (req, res) => {
    const now = new Date().toISOString();

    const inserted = insertLogsToDB([
        { timestamp: now, source: "demo", severity: "info", message: "batch 1", created_at: now },
        { timestamp: now, source: "demo", severity: "warning", message: "batch 2", created_at: now },
        { timestamp: now, source: "demo", severity: "error", message: "batch 3", created_at: now },
    ]);

    res.json({ sucess:true, inserted:inserted });
});

// ############## start server ##############
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

initializeDB();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} ...`);
});
