const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'report.html',
  'report.json',
  'report.md'
];

function isBinary(buffer) {
  const checkLimit = Math.min(buffer.length, 8000);
  for (let i = 0; i < checkLimit; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

function loadGitignore(dir) {
  const gitignorePath = path.join(dir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];
  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    return content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        let pattern = line;
        // Escape standard regex characters except wildcards * and ?
        pattern = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, (m) => {
          if (m === '*' || m === '?') return m;
          return '\\' + m;
        });
        pattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
        if (line.endsWith('/')) {
          pattern = pattern + '.*';
        }
        return new RegExp('^' + pattern + '$|/' + pattern + '$|/' + pattern + '/');
      });
  } catch (err) {
    return [];
  }
}

function shouldIgnore(filePath, relativePath, gitignoreRules) {
  const parts = relativePath.split(path.sep);
  // Skip global default folders/files
  if (parts.some(part => DEFAULT_IGNORE.includes(part))) {
    return true;
  }

  // Normalize path backslash to forward slash for pattern checks
  const normalizedPath = relativePath.replace(/\\/g, '/');
  for (const regex of gitignoreRules) {
    if (regex.test(normalizedPath)) {
      return true;
    }
  }

  return false;
}

async function scanFile(filePath, rules) {
  const findings = [];
  const activeRules = rules.filter(r => r.enabled);
  if (activeRules.length === 0) return findings;

  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8000);
    const bytesRead = fs.readSync(fd, buffer, 0, 8000, 0);
    if (isBinary(buffer.slice(0, bytesRead))) {
      return findings; // Skip scanning binary files
    }
  } catch (err) {
    return findings; // If can't read header, skip it
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    for (const rule of activeRules) {
      try {
        const regex = new RegExp(rule.pattern, rule.flags);
        let match;
        if (rule.flags.includes('g')) {
          while ((match = regex.exec(line)) !== null) {
            findings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              description: rule.description,
              filePath,
              lineNumber,
              matchedText: match[0],
              lineContent: line.trim()
            });
            if (regex.lastIndex === match.index) {
              regex.lastIndex++;
            }
          }
        } else {
          match = regex.exec(line);
          if (match) {
            findings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              description: rule.description,
              filePath,
              lineNumber,
              matchedText: match[0],
              lineContent: line.trim()
            });
          }
        }
      } catch (err) {
        // Skip rule compile error during runtime
      }
    }
  }

  return findings;
}

async function scanDirectory(targetDir, rules, progressCallback) {
  const absoluteTargetDir = path.resolve(targetDir);
  if (!fs.existsSync(absoluteTargetDir)) {
    throw new Error(`Directory "${targetDir}" does not exist.`);
  }

  const gitignoreRules = loadGitignore(absoluteTargetDir);
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(absoluteTargetDir, fullPath);

      if (shouldIgnore(fullPath, relativePath, gitignoreRules)) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  walk(absoluteTargetDir);

  let allFindings = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (progressCallback) {
      progressCallback(file, i + 1, files.length);
    }
    try {
      const fileFindings = await scanFile(file, rules);
      allFindings = allFindings.concat(fileFindings);
    } catch (err) {
      // Continue to next file on failure
    }
  }

  return {
    scannedFiles: files.length,
    findings: allFindings
  };
}

module.exports = {
  scanDirectory,
  scanFile
};
