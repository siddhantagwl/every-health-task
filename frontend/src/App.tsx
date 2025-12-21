import { useEffect, useState } from "react";
import { getLogs, getStats, ingestLogs, type LogRow, type LogStatistics } from "./api";
import type { IngestResult } from "./api";
import { LogsDashboard } from "./components/LogsDashboard";

export default function App() {
  const [status, setStatus] = useState("");
  const [stats, setStats] = useState<LogStatistics | null>(null);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

  // filter state - maybe move this to a custom hook later ?? look for hooks best practices
  const [severity, setSeverity] = useState<"" | "debug" | "info" | "warning" | "error">("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);

  const [lastIngest, setLastIngest] = useState<IngestResult | null>(null);

  async function refreshStats() {
      try {
          const s = await getStats();
          setStats(s);
      } catch (e) {
        console.error("Stats failed:", e);
        setStatus("Failed to load stats");
      }
  }

  async function loadLogs() {
      setLogsLoading(true);
      setStatus(""); // clear any previous errors

      try {
        // iso date conversion
        const fromIso = from ? new Date(from).toISOString() : undefined;
        const toIso = to ? new Date(to).toISOString() : undefined;

        const filters = {
            limit,
            severity: severity || undefined,
            from: fromIso,
            to: toIso,
        };
        console.log("Loading logs with filters:", filters); // debug
        const rows = await getLogs(filters);
        setLogs(rows);

      } catch (e) {
        console.error("Load logs error:", e);
        setStatus("Failed to load logs");
      } finally {
          setLogsLoading(false);
      }
  }

  // load initial dataa
  useEffect(() => {
      void refreshStats();
      void loadLogs();
      setLastIngest(null);
  }, []);

  // TODO: add debouncing for filter changes (will take time later)
  async function onUpload(file: File) {
    setLastIngest(null);
    setStatus("");

    try {
        // read file content and parse as json
        const text = await file.text();
        const parsed = JSON.parse(text);

        // validate parsed is an array
        if (!Array.isArray(parsed)) {
          setStatus("Upload JSON must be an array");
          return;
        }

        console.log("Parsed upload file");

        // ingest logs TO BACKEND
        setStatus("Uploading...");
        const result = await ingestLogs(parsed);

        setLastIngest(result);

        // show results to user
        setStatus("");
        await refreshStats();
        await loadLogs();

    } catch (e) {
      console.error("Upload error:", e);
      setStatus("Upload failed - check console for details");
    }
  }

const resetFilters = () => {
    setSeverity("");
    setFrom("");
    setTo("");
    setLimit(50);
    // should probably reload logs here too
  };

 return (
    <LogsDashboard
      status={status}
      stats={stats}
      logs={logs}
      logsLoading={logsLoading}
      lastIngest={lastIngest}

      // filters values
      severity={severity}
      from={from}
      to={to}
      limit={limit}

      // handlers
      onSeverityChange={setSeverity}
      onFromChange={setFrom}
      onToChange={setTo}
      onLimitChange={setLimit}
      onUpload={(file) => void onUpload(file)}
      onApply={() => void loadLogs()}
      onReloadLogs={() => void loadLogs()}
      onReset={resetFilters}
  />
  );
}
