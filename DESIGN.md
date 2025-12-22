# Design reflection

## Overview

internal monitoring tool for health service logs. supports uploading a JSON file with log entries, validating and storing them in SQLite, querying logs with filters, and showing severity based summary stats. A key constraint is safe handling of sensitive data/PII.

## 1. Design choices and trade offs

### Backend framework and API style

tech: Node.js with TypeScript and Express, exposing a REST API.

### Storage choice

used SQLite because it is simple to run locally, has zero external dependencies, and supports realistic query patterns for filters and aggregation.

Trade offs:
SQLite is not ideal for high write concurrency at scale. For production I would move to PostgreSql.

### Data model

A single `logs` table stores:
timestamp, source, severity, message, created_at

timestamp represents event time from the upstream system.
created_at represents ingestion time.

This distinction helps later when we want to audit pipeline delays or build ingestion monitoring.

### Validation

The ingest endpoint validates each log entry:
timestamp is a valid ISO timestamp
source and message are non empty strings
severity is one of debug, info, warning, error (i kept it simple based on s/w severity :) but it can be customized easily)

The ingest API returns partial success:
inserted count, failed count, and per row error messages.
This makes the tool usable with imperfect inputs. and tthen the user can decide what to do with the rows that were failed.

I am not checking for duplicated logs currently - which might inflate my stats unncessarily. we should add this check somehow before persisting data.

### Sensitive fields handling

I removed patient_id before storing and never returned it from the API. This reduces risk if the database file or UI output is exposed accidently. maybe haing a hash of source+timestamp +message could be a nice unique key to define a single log row.

Trade offs
Dropping patient_id means losing correlation by patient. If correlation is needed based on our business usecase, a safer production approach is to store a salted hash of the identifier (hash + sha256 can be a good start for security), or do correlation in a protected system with strict access controls for devs only (but can cause trouble with compliance)

Important note that i realized down the development process:
Even without patient_id, what if athe message field can contain sensitive data?? In production I would treat message as potentially sensitive and avoid free text or apply redaction rules \*(based on how this msg field is being generated). I have describe this in the production section.

### Safety limits

I added basic limits to prevent resource exhaustion:
Express JSON body size limit of 1 mb.
Max number of log entries per ingest request (10,000 log entries)

### Indexing

Due to time, I deferred from adding indexes, but the next step would be indexing by timestamp and severity to speed up filtering, since the DB can get read heavy.

### Timezone Normalization

was confusing at start while i was doing filtering, coz of UTC and my local time. my idea was to store everything in utc on servers aand display in local and explicitly mention that in the UI. but we can also have an option to switch to just UTC view if needed.

### Sorting of fields

Not implemented, but can be done on all the columns of the field.

## 2. Production setting changes

### Privacy and compliance

In production, logs can still contain sensitive information even if patient_id is removed. Message strings can leak PII or PHI.

Production changes I would make:

1. avoid free text
2. apply redaction at ingestion, for ex: remove emails, names, IDs, SSNs and other identifiers
3. Encrypt data at rest and in transit
4. Add retention policies and secure deletion
5. Restrict log access by role and environment
6. Add audit logs for every view, filter, and export action (will help with audits/compliance)
7. Automated DB backups every 2 hours maybe (or based on use case)
8. Error handlign - currently not done best in interest of time, but a centralized error handler would be good. What happens when backend fails? and how does frontend knows what went wrong ?
9. Caching - if DB grows with a lot of events, then every refresh will cost us time and computations and things like stats that work on aggregation will be impacted (cache invalidation based on a short TTL)
10. Datenschutz (GDPR) - have to read more on this until when we are allowed to keep the data. ik Health data is not “store forever”. so retention policies are important.
11. api versioning - could do that if needed coz api can evolve based on requirements and govt policies for this domain.

### Scaling

To handle higher volume:

1. Move from SQLite to Postgres nad perform batch writes (postgres can handle our volume)
2. Add indexes on timestamp and severity
3. Add pagination and cursor based queries (in case our logs grow to millions and real time ingestion coz then we can do indexed lookups but complexity wise hard afaik)
4. async ingestion, logs land in object storage then are indexed and written to the database
5. Add rate limiting per user or per client if needed. or queue based ingestion
6. Thought: If ingestion volume becomes bursty or we need additional processing steps, we can introduce a queue between ingestion and persistence. A simple production first choice is SQS to buffer writes. If we later need multiple consumers, or a streaming analytics pipeline, Kafka becomes a strong option. but in either case, log events should be schema versioned and processed idempotently to avoid duplicate writes.

### Monitoring and observability

Add metrics and logs for:<br>
Ingest request rate and latency<br>
Validation failure rates<br>
Database write time<br>
Query latency for list and stats<br>
Application errors

## 3. AWS deployment (i have to dig thru some articles)

philosophy - start simple, scale when needed :)

Frontend: s3 + cloudfront CDN. areact static files, s3 is cheap and reliable for static hosting. CDN can load fast.aa

Backend: Single container ECS Fargate behind an Application Load Balancer. fargate doesnt need management of servers explicity and simplifies a lot of things (better performance per dollar of ec2 instances) rather than using our own VM which could be cheap but not scalable.

- load balancer : can be picky here - we might not need it as it adds cost/setup and we have 1 endpoint, but if we scale to multiple tasks - can think of adding one.
- aws lambda: can also work but ik it comes with overhead of to handle cold starts, DB connection pooling, and API Gateway setup. For a small internal API, container based hosting is simpler/more predictable.

Database: Use aws RDS Postgres for prod (gives backup+reliability)

Secrets: like the database pswd should not live in code or .env files in git. I would store them in AWS Secrets Manager and inject them into the running service.

Observability:
CloudWatch logs for application logs.
CloudWatch metrics and alarms for error rates and latency. helpful later to debug failures and performance issues.

## 4. Future expansion: auth, RBAC, audit logs

### Authentication

If this becomes a shared internal tool, we should not expose /logs access publicly. The backend should require users to sign in, then send an access token with each request.

A practical approach is to use an identity provider such as AWS Cognito (or any existing company SSO provider). After login, the frontend receives a token. The backend verifies that token on every request and extracts the user identity from it.

### RBAC

Once we know who the user is, we decide what they are allowed to do using roles.

Example roles

- Viewer: can list logs and view stats
- Operator: can ingest logs and view stats
- Admin: can manage retention settings and export data

Implementation approach

- Enforce permissions in Express middleware so routes stay clean. For example, the ingest endpoint would require Operator or Admin, while read only endpoints would allow Viewer as well.

By default I know health systems follow leaast privilege. most users shud just view and not ingest/export.

### Audit logs

If sensitive data is involved, we need to answer questions like: who accessed logs, what they searched for, and whether data was exported.

Add an append only audit table capturing: (No updates to avoid tempering)

- user who performed the action with what filters
- user ingested N logs
- how many records were returned
- whether any exports occurred and metadata

supports compliance, incident response, and internal accountability or the industry best practices when it comes to deal with PII/PHI
