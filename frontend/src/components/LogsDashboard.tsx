import type { IngestResult, LogRow, LogStatistics } from "../api";

// todo : getting big here - split into smaller components ??
type Props = {
    status: string;
    stats: LogStatistics | null;
    logs: LogRow[];
    logsLoading: boolean;
    lastIngest: IngestResult | null

    // filters state
    severity: "" | "debug" | "info" | "warning" | "error"; // match backend severity type
    from: string;
    to: string;
    limit: number;

    // handlers
    onSeverityChange: (v: "" | "debug" | "info" | "warning" | "error") => void;
    onFromChange: (v: string) => void;
    onToChange: (v: string) => void;
    onLimitChange: (v: number) => void;
    onUpload: (file: File) => void;
    onApply: () => void;
    onReloadLogs: () => void;
    onReset: () => void;
};

export function LogsDashboard(props: Props) {
  const { status, stats, logs,
        logsLoading,
        lastIngest,
        severity,
        from,
        to,
        limit,
        onSeverityChange,
        onFromChange,
        onToChange,
        onLimitChange,
        onUpload,
        onApply,
        onReloadLogs,
        onReset
    } = props;

  // quick helper for severity colors
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'error': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#0dcaf0';
      case 'debug': return '#6c757d';
      default: return '#000';
    }
  };

  return (
    <div className="container py-4">
        {/* heading with logo */}
        <nav className="navbar mb-4 justify-content-center d-flex flex-column">
          <a className="navbar-brand  align-items-center" href="https://www.every.health/en/" target="_blank" rel="noopener noreferrer">
            <div
              style={{
                background: "rgba(255, 255, 255, 0.85)",
                padding: "10px 14px",
                borderRadius: 14,
                display: "inline-flex",
                alignItems: "center",
              }}>
                  <img src="/assets/EH_Logotype_Logo.avif" alt="Every Health logo" className="mb-2" style={{ height: 20, width: "auto", objectFit: "contain" }}/>
              </div>
          </a>
          <div className="mt-3 eh-pill">Health Logs Monitor</div>
      </nav>

      {/* json file upload section */}
      <section className="card p-3 mb-4">
        <h5 className="card-title text-primary">Upload JSON</h5>
        <input type="file" accept="application/json" onChange={(e) => {const f = e.target.files?.[0]; if (f) onUpload(f); }}/>
        {status && <p style={{ marginTop: 8, opacity: 0.8 }}>{status}</p>}

        {/* last ingest results */}
        {lastIngest && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600 }}>
              Inserted {lastIngest.inserted}, failed {lastIngest.failed}
            </div>

            {lastIngest.failed > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, opacity: 0.8 }}>Errors (first 10)</div>
                <ul style={{ marginTop: 6 }}>
                  {lastIngest.errors.slice(0, 10).map((e, idx) => (
                    <li key={idx}>
                      index {e.index}: {e.err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stats section */}
      <section className="card p-3 mb-4">
        <h5 className="card-title text-primary">Stats</h5>
        {!stats ? (
          <div className="text-muted">Loading stats...</div>
        ) : (
          <div className="d-flex flex-wrap gap-3">
            <StatCard label="Total logs" value={stats.total} big />
            <StatCard label="debug" value={stats.severityBreakdown.debug ?? 0} />
            <StatCard label="info" value={stats.severityBreakdown.info ?? 0} />
            <StatCard label="warning" value={stats.severityBreakdown.warning ?? 0} />
            <StatCard label="error" value={stats.severityBreakdown.error ?? 0} />
          </div>
        )}
      </section>

      {/* Logs table section */}
      <section className="card p-3 mb-4">
        <h5 className="card-title text-primary">Logs</h5>

        {/* filters section */}
        <div className="d-flex flex-wrap gap-3 align-items-center">
            <label>
              Severity{" "}
              <select
                value={severity}
                disabled={logsLoading}
                onChange={(e) => onSeverityChange(e.target.value as any)}
              >
                <option value="">All</option>
                <option value="debug">debug</option>
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="error">error</option>
              </select>
            </label>

            <label>
              From{" "}
              <input
                type="datetime-local"
                value={from}
                disabled={logsLoading}
                onChange={(e) => onFromChange(e.target.value)}
              />
            </label>

            <label>
              To{" "}
              <input
                type="datetime-local"
                value={to}
                disabled={logsLoading}
                onChange={(e) => onToChange(e.target.value)}
              />
            </label>

            <label>
              Limit{" "}
              <input
                type="number"
                min={1}
                max={500}
                value={limit}
                disabled={logsLoading}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                style={{ width: 90 }}
              />
            </label>

            <button className="btn btn-primary btn-sm me-2" onClick={onApply} disabled={logsLoading}>
              Apply
            </button>

            <button className="btn btn-outline-secondary btn-sm" onClick={onReset} disabled={logsLoading}>
              Reset
            </button>
        </div>

        <div className="d-flex align-items-center justify-content-between mt-2 text-muted">
          <small>
            Showing <b>{logs.length}</b> logs
          </small>
          {logsLoading && <small>Loading…</small>}
        </div>

        {/* logs table */}
        <table className="table table-sm table-striped mt-3">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Source</th>
              <th>Severity</th>
              <th>Message</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.timestamp).toLocaleString()}</td>
                <td>{l.source}</td>
                <td>
                  <span className="badge"
                      style={{
                        backgroundColor: getSeverityColor(l.severity),
                        fontSize: '10px'
                      }}>{l.severity}</span>
                </td>
                <td style={{ wordBreak: "break-word" }}>{l.message}</td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan={4}>
                  No logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}


function StatCard(props: { label: string; value: number; big?: boolean }) {
  return (
    <div
      className="border rounded-3 p-3 bg-light"
      style={{
        minWidth: props.big ? 220 : 140,
        flex: props.big ? "1 1 220px" : "0 0 auto",
      }}
    >
      <div className="small text-muted">{props.label}</div>
      <div style={{ fontSize: props.big ? 28 : 22, fontWeight: 600 }}>{props.value}</div>
    </div>
  );
}
