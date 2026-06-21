const process = require('process');

/**
 * Gathers runtime environment information.
 * Handles potential errors/exceptions gracefully.
 * @returns {Object} JSON object containing environment information.
 */
function scanEnvironment() {
  const envInfo = {};

  try {
    envInfo.nodeVersion = process.version || null;
  } catch (err) {
    envInfo.nodeVersion = null;
  }

  // Also record execution environment settings
  try {
    envInfo.envMode = process.env.NODE_ENV || 'production';
  } catch (err) {
    envInfo.envMode = null;
  }

  try {
    envInfo.execPath = process.execPath || null;
  } catch (err) {
    envInfo.execPath = null;
  }

  return envInfo;
}

module.exports = {
  scanEnvironment
};
