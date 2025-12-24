# Every Health: Health Logs Monitor

![Demo](demo_recording.gif)

## Features

- Upload a JSON file containing an array of log entries
- Validate logs and store them in SQLite
- Filter logs by severity and timestamp range
- Show total log count and counts by severity
- Sensitive field handling: `patient_id` is ignored and not stored or displayed
- Basic safety limits: JSON body size limit and max logs per ingest request

## Tech stack

Backend

- Node.js + TypeScript
- Express
- SQLite (better sqlite3)

Frontend

- React + TypeScript
- Bootstrap

## Project structure and Setup

- `backend/` Express API
- `frontend/` React UI

### 1) Backend setup

```bash
cd backend
npm install
npm run dev
```

### 2) Frontend setup

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### POST `/logs/ingest`

Ingest a batch of log entries.

#### Request Body

```json
{
  "logs": [
    {
      "timestamp": "2025-12-21T14:25:43Z",
      "source": "patient-monitoring",
      "severity": "info",
      "message": "Patient vitals recorded successfully",
      "patient_id": "pt001"
    }
  ]
}
```

#### Behavior

- `patient_id` is ignored and not stored
- Each log entry is validated individually
- Partial success is supported

#### Response

**Success response:**

```json
{
  "inserted": 1,
  "failed": 0,
  "errors": []
}
```

**Partial failure response:**

```json
{
  "inserted": 3,
  "failed": 1,
  "errors": [{ "index": 2, "err": "Invalid severity" }]
}
```

### GET `/logs`

List logs with optional filters.

#### Query Parameters

| Parameter  | Description                                    |
| ---------- | ---------------------------------------------- |
| `limit`    | Number of logs to return (default 50, max 500) |
| `severity` | `debug` \| `info` \| `warning` \| `error`      |
| `from`     | ISO timestamp (UTC)                            |
| `to`       | ISO timestamp (UTC)                            |

#### Examples

```bash
curl "http://localhost:5000/logs?severity=error&limit=50"

curl "http://localhost:5000/logs?from=2025-12-21T14:00:00.000Z&to=2025-12-21T15:00:00.000Z"
```

#### Response

```json
[
  {
    "id": 12,
    "timestamp": "2025-12-21T14:27:02.000Z",
    "source": "lab-results",
    "severity": "error",
    "message": "Critical lab value detected",
    "created_at": "2025-12-21T14:27:10.123Z"
  }
]
```

### GET `/logs/stats`

Return aggregated log statistics.

#### Response

```json
{
  "total": 120,
  "severityBreakdown": {
    "debug": 20,
    "info": 70,
    "warning": 20,
    "error": 10
  }
}
```

## Log Format

Each log entry supports:

| Field        | Notes                                     |
| ------------ | ----------------------------------------- |
| `timestamp`  | ISO string, event time                    |
| `source`     | Service name                              |
| `severity`   | `debug` \| `info` \| `warning` \| `error` |
| `message`    | Log message                               |
| `patient_id` | ignored and not stored          |

## Notes and Limitations

- SQLite is used for simplicity and local development. In production, a multi-client database such as Postgres should be used.
- Database indexes on timestamp and severity are not added yet.
- The message field may contain sensitive data in real systems. In production, structured logs and redaction should be applied.
- Timestamps are stored and queried in UTC. The UI displays them in local time.

## Scripts

### Backend

- `npm run dev` – start API in development mode

### Frontend

- `npm run dev` – start UI
