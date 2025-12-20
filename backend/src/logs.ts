import { db } from "./db/db.ts";

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
