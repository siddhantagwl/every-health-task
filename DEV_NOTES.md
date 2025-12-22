# TASK DEVELOPMENT notes and debugging journey

documents the main issues I hit while building the take home and how I resolved them. I kept this as an evidence of the engineering process and to highlight my design reasoning.

## 1. setup: Node and TypeScript module system mismatch

Issue: Must use import to load ES Module, and TypeScript warnings about ECMAScript imports in a CommonJS file.

What was happening:
My server code used ES module import syntax, but my runtime config and TypeScript compiler settings were not aligned. Some files were treated as CommonJS while others were treated as ESM.

Fix:
I aligned the project to one module system and made TypeScript and Node execution consistent. After the change, imports worked without runtime errors and editor warnings were gone.

## 2. frotend: Duplicate ingest status shown in UI

Issue
After upload, the UI showed ingest results twice, once via a status string and once via last ingest summary.

Root cause
I displayed the same information from two state sources.

Fix
I separated responsibilities:
Status is used for transient states like uploading and failures.
Last ingest is used for success summary and error list.

## 5. Filtering returned zero logs due to timezone confusion

Issue
I selected a time range in the UI and the API returned zero logs, even though logs existed.

Root cause
Uploaded log timestamps included Z which means UTC.
The datetime local input is local timezone.
The frontend converts local time to UTC for API calls using toISOString, which is correct but can be confusing.

Resolution
I verified the timestamps and confirmed the filter window did not overlap with the log event times.
I also decided to normalize timestamps at ingest so the database stores consistent UTC ISO strings.

Lesson
Time handling is one of the easiest places to introduce bugs. I chose consistent UTC storage and explicit conversion at boundaries.

## 6. Small architecture decision points

not bugs, but deliberate decisions I made while building:
1. Drop patient_id before storing instead of only hiding it in the UI
2. Add request size and max ingest count limits to avoid resource exhaustion
3. Use a dedicated api client module on the frontend for clean separation
4. Keep SQLite indexes as a future improvement due to time constraints
5. no proper error handling done yet expect some small validations
6. used bootstrap classes for simplicity and beautification
