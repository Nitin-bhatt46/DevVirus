const fs = require('fs');
const path = require('path');

/**
 * Recursively scans target directory to gather metadata:
 * total files, total folders, largest file, and file extension distribution.
 * Ignores 'node_modules'. Handles exceptions gracefully.
 * @param {string} dirPath Target project directory path (defaults to '.')
 * @returns {Object} Statistics JSON object.
 */
function scanProject(dirPath = '.') {
  const absolutePath = path.resolve(dirPath);

  const stats = {
    totalFiles: 0,
    totalFolders: 0,
    largestFile: {
      name: null,
      path: null,
      size: 0
    },
    extensionStats: {}
  };

  if (!fs.existsSync(absolutePath)) {
    return stats;
  }

  function walk(currentDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      // Fail gracefully on read errors (permissions etc)
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Explicitly ignore node_modules
      if (entry.name === 'node_modules') {
        continue;
      }

      if (entry.isDirectory()) {
        stats.totalFolders++;
        walk(fullPath);
      } else if (entry.isFile()) {
        stats.totalFiles++;

        let fileSize = 0;
        try {
          const fileStat = fs.statSync(fullPath);
          fileSize = fileStat.size;
        } catch (err) {
          // File size stays 0 if read fails
        }

        if (fileSize > stats.largestFile.size) {
          stats.largestFile.name = entry.name;
          stats.largestFile.path = fullPath;
          stats.largestFile.size = fileSize;
        }

        const ext = path.extname(entry.name).toLowerCase();
        if (ext) {
          stats.extensionStats[ext] = (stats.extensionStats[ext] || 0) + 1;
        } else {
          stats.extensionStats['no-extension'] = (stats.extensionStats['no-extension'] || 0) + 1;
        }
      }
    }
  }

  walk(absolutePath);

  if (stats.largestFile.size === 0) {
    stats.largestFile = null;
  }

  return stats;
}

module.exports = {
  scanProject
};
