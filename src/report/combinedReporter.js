const fs = require('fs');
const path = require('path');
const { scanSystem } = require('../scanner/systemScanner');
const { scanEnvironment } = require('../scanner/environmentScanner');
const { scanProject } = require('../scanner/projectScanner');

/**
 * Combines system, environment, project metrics, and mutation audit logs
 * into a single consolidated report.json file.
 * @param {string} outPath Destination output path for the JSON report (defaults to 'report.json')
 * @param {string} targetDir Target project directory to analyze (defaults to '.')
 * @returns {Object} Structured response containing success status and paths.
 */
function generateCombinedReport(outPath = 'report.json', targetDir = '.') {
  try {
    const sysInfo = scanSystem();
    const envInfo = scanEnvironment();
    const projectInfo = scanProject(targetDir);

    let mutationHistory = [];
    const mutLogPath = path.join(process.cwd(), 'logs', 'mutation-log.json');
    if (fs.existsSync(mutLogPath)) {
      try {
        const raw = fs.readFileSync(mutLogPath, 'utf8');
        mutationHistory = JSON.parse(raw);
        if (!Array.isArray(mutationHistory)) {
          mutationHistory = [];
        }
      } catch (err) {
        // Fallback to empty array if parse failed or log is corrupted
        mutationHistory = [];
      }
    }

    const report = {
      timestamp: new Date().toISOString(),
      systemInfo: {
        os: sysInfo.os,
        architecture: sysInfo.architecture,
        hostname: sysInfo.hostname,
        platform: sysInfo.platform,
        homeDirectory: sysInfo.homeDirectory
      },
      environmentInfo: {
        nodeVersion: envInfo.nodeVersion,
        envMode: envInfo.envMode,
        execPath: envInfo.execPath
      },
      projectAnalysis: {
        totalFiles: projectInfo.totalFiles,
        totalFolders: projectInfo.totalFolders,
        largestFile: projectInfo.largestFile,
        extensionStats: projectInfo.extensionStats
      },
      mutationHistory
    };

    const absOutPath = path.resolve(outPath);
    const parentDir = path.dirname(absOutPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(absOutPath, JSON.stringify(report, null, 2), 'utf8');
    return {
      success: true,
      path: absOutPath,
      data: report,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      path: null,
      data: null,
      error: err.message
    };
  }
}

module.exports = {
  generateCombinedReport
};
