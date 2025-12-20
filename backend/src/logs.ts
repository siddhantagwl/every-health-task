import { db } from "./db/db.ts";

export type LogRow = {
    id: number;
    timestamp: string;
    source: string;
    severity: string;
    message: string;
    created_at: string;
};

export function insertTestLog(): void {
    const now = new Date().toISOString();

    const insert = db.prepare(`
        INSERT INTO logs (timestamp, source, severity, message, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    insert.run(now, "demo", "info", "SQLite test", now);
}

export function countLogs(): number {
    const row = db.prepare(`SELECT COUNT(*) as count FROM logs`).get() as { count: number };
    return row.count;
}

const MAX_LIMIT = 500;

export function listLogs(limit: number): LogRow[] {

    const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

    const query = db.prepare(`
        SELECT id, timestamp, source, severity, message, created_at
        FROM logs
        ORDER BY id DESC
        LIMIT ?
    `);

    return query.all(safeLimit) as LogRow[];
}