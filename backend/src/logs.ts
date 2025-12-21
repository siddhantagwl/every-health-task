import { db } from "./db/db";
import { ALLOWED_SEVERITIES, type Severity, isSeverity } from "./severity";

// logs dto - api
export type LogRow = {
    id: number;
    timestamp: string; //lexicographicly sortable timestamp
    source: string;
    severity: string;
    message: string;
    created_at: string;
};

// write dto
export type NewLogRow = Omit<LogRow, "id">;

export type LogFilters = {
    severity?: Severity;
    from?: string;
    to?: string;
    limit: number;
};

export type LogStatistics = {
    total: number;
    severityBreakdown: Record<Severity, number>;
};

export type IngestError = { index: number; err: string };




// ##### log operations #####

export function insertTestLog(): void {
    const now = new Date().toISOString();

    const insert = db.prepare(`
        INSERT INTO logs (timestamp, source, severity, message, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    insert.run(now, "demo", "debug", "SQLite test", now);
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

function isIsoDateString(value: string): boolean {
    // validate iso string
    const t = Date.parse(value);
    return Number.isFinite(t);
}

export function listLogsFiltered(filters: LogFilters): LogRow[] {
    const safeLimit = Math.max(1, Math.min(filters.limit, MAX_LIMIT));

    const sqlConditions: string[] = [];
    const params: unknown[] = [];

    if (filters.severity) {
        sqlConditions.push("severity = ?");
        params.push(filters.severity);
    }

    if (filters.from) {
        if (!isIsoDateString(filters.from)) {
            throw new Error("Invalid FROM timestamp");
        }
        sqlConditions.push("timestamp >= ?");
        params.push(filters.from);
    }

    if (filters.to) {
        if (!isIsoDateString(filters.to)) {
            throw new Error("Invalid TO timestamp");
        }
        sqlConditions.push("timestamp <= ?");
        params.push(filters.to);
    }

    const whereSql = sqlConditions.length ? `WHERE ${sqlConditions.join(" AND ")}` : "";

    const query = db.prepare(`
        SELECT id, timestamp, source, severity, message, created_at
        FROM logs
        ${whereSql}
        ORDER BY timestamp DESC, id DESC
        LIMIT ?
    `);

    return query.all(...params, safeLimit) as LogRow[];
}

export function getLogStatistics(): LogStatistics {
    // returns total logs and count by severity as an object
    // aggregation - can help in building dashboards and overviews
    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM logs`).get() as { count: number };

    const rows = db.prepare(`
        SELECT severity, COUNT(*) as count FROM logs GROUP BY severity
    `).all() as Array<{ severity: string; count: number }>;

    const severityBreakdown = Object.fromEntries(
        ALLOWED_SEVERITIES.map((s) => [s, 0])
    ) as Record<Severity, number>;

    for (const r of rows) {
        if (isSeverity(r.severity)) {
            severityBreakdown[r.severity] = r.count;
        }
    }

    return { total: totalRow.count, severityBreakdown };
}

export function insertLogsToDB(rows: NewLogRow[]): number {
    // inserts multiple log rows to the database in a transaction
    if (rows.length === 0) return 0;

    const query = db.prepare(`
        INSERT INTO logs (timestamp, source, severity, message, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items: NewLogRow[]) => {
        for (const r of items) {
            query.run(r.timestamp, r.source, r.severity, r.message, r.created_at);
        }
    });

    transaction(rows);
    return rows.length;
}

export function buildRowsForInsert(logs: any[]): { rows: NewLogRow[]; errors: IngestError[] } {
    const rows: NewLogRow[] = [];
    const errors: IngestError[] = [];
    const createdAt = new Date().toISOString();

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        if (!log || typeof log !== "object") {
            errors.push({ index: i, err: "Log must be an object" });
            continue;
        }

        const { timestamp, source, severity, message } = log;

        if (typeof timestamp !== "string" || !isIsoDateString(timestamp)) {
            errors.push({ index: i, err: "Invalid timestamp" });
            continue;
        }

        if (typeof source !== "string" || source.trim() === "") {
            errors.push({ index: i, err: "Invalid source" });
            continue;
        }

        if (typeof message !== "string" || message.trim() === "") {
            errors.push({ index: i, err: "Invalid message" });
            continue;
        }

        if (typeof severity !== "string" || !isSeverity(severity)) {
            errors.push({ index: i, err: "Invalid severity" });
            continue;
        }

        // valdation passed - now push it to rows without patient_id
        rows.push({
            timestamp,
            source,
            severity: severity as Severity,
            message,
            created_at: createdAt,
        });
    }

    return { rows, errors };
}
