const os = require('os');

/**
 * Gathers system-level hardware and operating system details.
 * Handles potential errors/exceptions gracefully.
 * @returns {Object} JSON object containing system information.
 */
function scanSystem() {
  const systemInfo = {};

  try {
    systemInfo.os = os.type() || null;
  } catch (err) {
    systemInfo.os = null;
  }

  try {
    systemInfo.architecture = os.arch() || null;
  } catch (err) {
    systemInfo.architecture = null;
  }

  try {
    systemInfo.hostname = os.hostname() || null;
  } catch (err) {
    systemInfo.hostname = null;
  }

  try {
    systemInfo.platform = os.platform() || null;
  } catch (err) {
    systemInfo.platform = null;
  }

  try {
    systemInfo.homeDirectory = os.homedir() || null;
  } catch (err) {
    systemInfo.homeDirectory = null;
  }

  return systemInfo;
}

module.exports = {
  scanSystem
};
