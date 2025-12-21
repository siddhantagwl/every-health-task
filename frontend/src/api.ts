// made this file so that i can wire up api calls from frontend to backend

const BASE_URL = "http://localhost:5000";

export type Severity = "debug" | "info" | "warning" | "error";

export type LogRow = {
    id: number;
    timestamp: string;
    source: string;
    severity: Severity;
    message: string;
    created_at: string;
};

export type LogStatistics = {
    total: number;
    severityBreakdown: Record<Severity, number>;
};

export type IngestResult = {
    inserted: number;
    failed: number;
    errors: Array<{ index: number; err: string }>;
};

export async function ingestLogs(logs: unknown[]): Promise<IngestResult> {
    const res = await fetch(`${BASE_URL}/logs/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.error ?? "Ingest failed");
    }

    return data as IngestResult;
}

export async function getLogs(params: {
    limit?: number;
    severity?: Severity;
    from?: string;
    to?: string;
}): Promise<LogRow[]> {

    const url = new URL(`${BASE_URL}/logs`);
    
    if (params.limit) url.searchParams.set("limit", String(params.limit));
    if (params.severity) url.searchParams.set("severity", params.severity);
    if (params.from) url.searchParams.set("from", params.from);
    if (params.to) url.searchParams.set("to", params.to);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.error ?? "Fetch logs failed");
    }

    return (data.logs ?? []) as LogRow[];
}

export async function getStats(): Promise<LogStatistics> {
    const res = await fetch(`${BASE_URL}/logs/stats`);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.error ?? "Fetch stats failed");
    }

    return data as LogStatistics;
}
