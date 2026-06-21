const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(process.cwd(), 'logs');
const MUTATION_LOG = path.join(LOGS_DIR, 'mutation-log.json');

/**
 * Appends a log entry to logs/mutation-log.json recording a file CRUD action.
 * Creates parent directory and log file if they don't exist.
 * @param {string} operation The CRUD action type: CREATE, READ, UPDATE, DELETE
 * @param {string} file The target file path
 * @param {string} status The status outcomes: SUCCESS, FAILED
 * @returns {boolean} True if successfully logged, false otherwise.
 */
function logMutation(operation, file, status) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    let logs = [];
    if (fs.existsSync(MUTATION_LOG)) {
      try {
        const raw = fs.readFileSync(MUTATION_LOG, 'utf8');
        logs = JSON.parse(raw);
        if (!Array.isArray(logs)) {
          logs = [];
        }
      } catch (err) {
        // If file corrupted or invalid JSON, start fresh
        logs = [];
      }
    }

    const entry = {
      timestamp: new Date().toISOString(),
      operation: String(operation).toUpperCase(),
      file: path.resolve(file),
      status: String(status).toUpperCase()
    };

    logs.push(entry);
    fs.writeFileSync(MUTATION_LOG, JSON.stringify(logs, null, 2), 'utf8');
    return true;
  } catch (err) {
    // Fail silently/gracefully during execution
    return false;
  }
}

module.exports = {
  logMutation
};
