const fs = require('fs');
const path = require('path');
const { logMutation } = require('../logger/mutationLogger');

/**
 * Creates a file with content. Fails if the file already exists.
 * Automatically creates parent directories if they don't exist.
 * @param {string} filePath Target file path
 * @param {string} content File contents (defaults to '')
 * @returns {Object} Structured JSON response
 */
function createFile(filePath, content = '') {
  try {
    const absPath = path.resolve(filePath);
    if (fs.existsSync(absPath)) {
      logMutation('CREATE', filePath, 'FAILED');
      return {
        success: false,
        data: null,
        error: `File already exists: ${absPath}`
      };
    }

    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absPath, content, 'utf8');
    const stat = fs.statSync(absPath);

    logMutation('CREATE', filePath, 'SUCCESS');
    return {
      success: true,
      data: {
        path: absPath,
        size: stat.size
      },
      error: null
    };
  } catch (err) {
    logMutation('CREATE', filePath, 'FAILED');
    return {
      success: false,
      data: null,
      error: err.message
    };
  }
}

/**
 * Reads file content. Fails if the file does not exist.
 * @param {string} filePath Target file path
 * @returns {Object} Structured JSON response
 */
function readFile(filePath) {
  try {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      logMutation('READ', filePath, 'FAILED');
      return {
        success: false,
        data: null,
        error: `File not found: ${absPath}`
      };
    }

    const content = fs.readFileSync(absPath, 'utf8');
    const stat = fs.statSync(absPath);

    logMutation('READ', filePath, 'SUCCESS');
    return {
      success: true,
      data: {
        path: absPath,
        content,
        size: stat.size
      },
      error: null
    };
  } catch (err) {
    logMutation('READ', filePath, 'FAILED');
    return {
      success: false,
      data: null,
      error: err.message
    };
  }
}

/**
 * Updates file content (either overwrites or appends). Fails if the file does not exist.
 * @param {string} filePath Target file path
 * @param {string} content Content to write or append
 * @param {boolean} append If true, appends content; otherwise overwrites (defaults to false)
 * @returns {Object} Structured JSON response
 */
function updateFile(filePath, content = '', append = false) {
  try {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      logMutation('UPDATE', filePath, 'FAILED');
      return {
        success: false,
        data: null,
        error: `File not found: ${absPath}`
      };
    }

    if (append) {
      fs.appendFileSync(absPath, content, 'utf8');
    } else {
      fs.writeFileSync(absPath, content, 'utf8');
    }

    const stat = fs.statSync(absPath);

    logMutation('UPDATE', filePath, 'SUCCESS');
    return {
      success: true,
      data: {
        path: absPath,
        size: stat.size
      },
      error: null
    };
  } catch (err) {
    logMutation('UPDATE', filePath, 'FAILED');
    return {
      success: false,
      data: null,
      error: err.message
    };
  }
}

/**
 * Deletes a file. Fails if the file does not exist.
 * @param {string} filePath Target file path
 * @returns {Object} Structured JSON response
 */
function deleteFile(filePath) {
  try {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      logMutation('DELETE', filePath, 'FAILED');
      return {
        success: false,
        data: null,
        error: `File not found: ${absPath}`
      };
    }

    fs.unlinkSync(absPath);

    logMutation('DELETE', filePath, 'SUCCESS');
    return {
      success: true,
      data: {
        path: absPath
      },
      error: null
    };
  } catch (err) {
    logMutation('DELETE', filePath, 'FAILED');
    return {
      success: false,
      data: null,
      error: err.message
    };
  }
}

module.exports = {
  createFile,
  readFile,
  updateFile,
  deleteFile
};
