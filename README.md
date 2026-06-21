# DevVirus 

A JavaScript-based Developer Environment Intelligence Tool that gathers system information, analyzes project environments, performs CRUD operations on code files, and generates structured reports.

---

# Overview

DevVirus is a Node.js application designed to collect and display system information, inspect environment variables, analyze project structures, and perform CRUD operations on source code files.

The project was built for **THUNDER HACKATHON 3.0** and extends the basic system information gathering requirement by providing project analysis, mutation logging, and report generation capabilities.

---

# Features

## System Information Collection

Collects:

* Operating System Details
* CPU Architecture
* Hostname
* Node.js Version
* Platform Information
* User Home Directory

---

## Environment Variable Collection

Safely gathers selected environment variables such as:

* PATH
* HOME
* USERNAME
* SHELL

Missing values are handled gracefully.

---

## Project Analysis

Scans the current project directory and provides:

* Total files
* Total folders
* Largest file
* File extension statistics

Automatically ignores:

* node_modules
* hidden system files

---

## CRUD Operations

Supports file manipulation operations:

### Create

Create new source code files.

### Read

Read and display file content.

### Update

Modify existing files.

### Delete

Remove files safely.

---

## Mutation Logging

Every CRUD operation is recorded in:

```text
logs/mutation-log.json
```

Each log entry contains:

* Timestamp
* Operation Type
* File Name
* Status

---

## Report Generation

Generates a complete project report:

```text
report.json
```

The report combines:

* System Information
* Environment Information
* Project Analysis
* Mutation History

---

# Technology Stack

* Node.js
* JavaScript
* Built-in Node Modules

Modules Used:

* os
* fs
* path

No external libraries are required.

---

# Project Structure

```text
DevVirus/
│
├── src/
│   ├── scanner/
│   │   ├── systemScanner.js
│   │   ├── environmentScanner.js
│   │   └── projectScanner.js
│   │
│   ├── crud/
│   │   └── crudEngine.js
│   │
│   ├── logger/
│   │   └── mutationLogger.js
│   │
│   ├── report/
│   │   └── reportGenerator.js
│   │
│   └── index.js
│
├── logs/
│   └── mutation-log.json
│
├── report.json
├── package.json
└── README.md
```

---

# Installation

Clone the repository:

```bash
git clone <repository-url>
```

Move into the project:

```bash
cd DevVirus
```

Install dependencies:

```bash
npm install
```

---

# Usage

## Run System Scan

```bash
node src/index.js scan
```

Example Output:

```json
{
  "os": "Windows_NT",
  "cpu": "x64",
  "hostname": "DESKTOP-PC",
  "nodeVersion": "v22.x",
  "platform": "win32",
  "homeDirectory": "C:\\Users\\User"
}
```
## Run any file 
```bash
node src/index.js scan "Path of the file location"
```

---

## Generate Full Report

```bash
node src/index.js report
```

Creates:

```text
report.json
```

---

## Create File

```bash
node src/index.js create test.js
```

---

## Read File

```bash
node src/index.js read test.js
```

---

## Update File

```bash
node src/index.js update test.js
```

---

## Delete File

```bash
node src/index.js delete test.js
```

---

# Code Flow

This section explains the internal workflow of DevVirus.

## Step 1 — User Command

The user executes a command:

```bash
node src/index.js scan
```

The command is parsed by:

```text
index.js
```

---

## Step 2 — Module Routing

The application determines which module should handle the request.

Examples:

```text
scan
 ├── systemScanner
 ├── environmentScanner
 └── projectScanner
```

```text
create
read
update
delete
 └── crudEngine
```

---

## Step 3 — Data Collection

Scanner modules gather information using Node.js APIs.

Example:

```javascript
os.platform()
os.arch()
os.hostname()
os.homedir()
process.version
process.env
```

---

## Step 4 — Data Processing

Raw information is:

* Validated
* Formatted
* Sanitized

Missing values are replaced with safe defaults.

Example:

```json
{
  "shell": "Not Available"
}
```

---

## Step 5 — CRUD Execution

If the command is a file operation:

```text
create
read
update
delete
```

The CRUD engine executes the request using:

```javascript
fs.readFile()
fs.writeFile()
fs.unlink()
```

---

## Step 6 — Mutation Logging

Every CRUD action is recorded.

Example:

```json
{
  "timestamp": "2026-06-21T12:00:00Z",
  "operation": "create",
  "file": "test.js",
  "status": "success"
}
```

---

## Step 7 — Report Generation

The report generator combines:

```text
System Information
+
Environment Information
+
Project Analysis
+
Mutation History
```

into:

```text
report.json
```

---

# Strategy

## Design Strategy

The project follows a modular architecture where each responsibility is separated into its own module.

Benefits:

* Easy maintenance
* Better readability
* Scalability
* Reusability

---

## Information Gathering Strategy

The application uses trusted Node.js system APIs to collect runtime and operating system information.

Advantages:

* Cross-platform compatibility
* No third-party dependencies
* Reliable output

---

## File Management Strategy

CRUD operations are isolated in a dedicated engine.

Benefits:

* Cleaner code structure
* Easier testing
* Better error handling

---

## Error Handling Strategy

All file and system operations are wrapped in try-catch blocks.

Possible errors handled:

* Missing files
* Invalid paths
* Permission issues
* Missing environment variables

Example Response:

```json
{
  "success": false,
  "message": "File not found"
}
```

---

# Output Formatting

All outputs are returned in structured JSON format whenever possible.

Benefits:

* Human-readable
* Machine-readable
* Easy integration with other tools

---

# Evaluation Criteria Mapping

| Requirement              | Implementation  |
| ------------------------ | --------------  |
| Operating System Details | ✅              |
| CPU Architecture         | ✅              |
| Hostname                 | ✅              |
| Node.js Version          | ✅              |
| Platform Information     | ✅              |
| Home Directory           | ✅              |
| Environment Variables    | ✅              |
| CRUD Operations          | ✅              |
| Error Handling           | ✅              |
| Documentation            | ✅              |
| Structured Output        | ✅              |

---

# Future Improvements

Potential enhancements include:

* Interactive CLI
* File Search Engine
* Project Dependency Analysis
* Real-Time Monitoring
* Web Dashboard
* Export Reports (CSV/PDF)
* Plugin System

---

# Author

Built for **THUNDER HACKATHON 3.0**

DevVirus demonstrates system information gathering, project analysis, CRUD operations, structured reporting, and robust error handling using JavaScript and Node.js.
