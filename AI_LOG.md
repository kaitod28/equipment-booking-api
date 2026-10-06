# AI Usage Log — Campus Equipment Booking API

This document records the interaction and assistance provided by AI during the development, debugging, testing, and documentation of the Campus Equipment Booking API midterm practical lab test.

---

## Overview of AI Assistance

AI was utilized as an interactive thought partner and technical assistant to:
1. Generate boilerplates and initial structure for Hono, TypeScript, and SQLite implementation.
2. Formulate database queries, schema definitions, and validation logic (including booking overlap detection).
3. Troubleshoot environment/shell issues (Windows PowerShell execution policy & cURL syntax/escaping).
4. Structure project documentation (`README.md`, `QUALITY_GATE_REVIEW.md`, and API contracts).

---

## Detailed Log Entries

| Phase / Topic | Prompt / Goal | AI Output & Contribution | Human Verification & Action Taken |
|---|---|---|---|
| **1. Architecture & Logic** | Implement REST API with Hono & SQLite including overlap check (`409`), validation (`400`), and lookup (`404`). | Provided code for `src/index.ts` with SQLite query logic checking existing booking time ranges (`startAt < existing.endAt` AND `endAt > existing.startAt`). | Reviewed and tested business logic against exam rubric to ensure correct HTTP status codes were returned. |
| **2. Documentation** | Create comprehensive `README.md` and API contract documentation. | Generated `README.md` containing setup commands (`npm install`, `npm run dev`), DB Schema / ERD description, and full API endpoint specifications. | Pasted into `README.md`, verified markdown formatting in VS Code preview, and saved the file. |
| **3. Shell Debugging (PowerShell)** | Resolve PowerShell script execution disabled error (`SecurityError: UnauthorizedAccess`). | Suggested using `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` or switching terminal shell to Command Prompt (`cmd`). | Executed execution policy bypass command and switched to `cmd` tab in VS Code Terminal to run scripts cleanly. |
| **4. cURL Syntax Fixes** | Resolve `400 Bad Request / Invalid JSON body` and `Invoke-WebRequest` alias errors when testing POST endpoints via `curl`. | Identified PowerShell alias collision (`curl` -> `Invoke-WebRequest`) and JSON quote escaping issues. Suggested using `curl.exe` with escaped quotes or testing via `cmd`. | Switched terminal to Command Prompt (`cmd`) and successfully executed all 5 cURL test cases. |
| **5. Postman Verification** | Troubleshoot unexpected `409 Conflict` response in Postman for POST booking request. | Explained that `409 Conflict` occurred because the test booking record already existed in `campus.db` from previous cURL tests, confirming overlap validation works. | Modified `startAt` and `endAt` dates to an available slot, re-ran in Postman, and received `201 Created` as expected. |

---

## Reflection & Integrity Statement

All AI-generated code snippets and command recommendations were tested, verified, and understood prior to inclusion in the final submission. The business logic, route handlers, error response formats, and testing procedures adhere strictly to the provided exam brief and rubric guidelines.