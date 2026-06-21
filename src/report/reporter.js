const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateJSON(reportData) {
  return JSON.stringify(reportData, null, 2);
}

function generateMarkdown(reportData) {
  const { scanDate, targetDirectory, scannedFiles, systemInfo, projectInfo, findings } = reportData;
  const severityCount = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach(f => {
    severityCount[f.severity.toLowerCase()] = (severityCount[f.severity.toLowerCase()] || 0) + 1;
  });

  let md = `# DevVirus Scan Report\n\n`;
  md += `- **Scan Target:** \`${targetDirectory}\`\n`;
  md += `- **Date:** ${scanDate}\n`;
  md += `- **Scanned Files:** ${scannedFiles}\n`;
  md += `- **Total Issues:** ${findings.length}\n\n`;

  if (systemInfo) {
    md += `### System Context\n\n`;
    md += `- **OS:** ${systemInfo.os || 'N/A'}\n`;
    md += `- **Platform:** ${systemInfo.platform || 'N/A'}\n`;
    md += `- **Architecture:** ${systemInfo.architecture || 'N/A'}\n`;
    md += `- **Node Version:** ${systemInfo.nodeVersion || 'N/A'}\n`;
    md += `- **Hostname:** ${systemInfo.hostname || 'N/A'}\n`;
    md += `- **Home Directory:** \`${systemInfo.homeDirectory || 'N/A'}\`\n\n`;
  }

  if (projectInfo) {
    md += `### Project Statistics\n\n`;
    md += `- **Total Files:** ${projectInfo.totalFiles}\n`;
    md += `- **Total Folders:** ${projectInfo.totalFolders}\n`;
    if (projectInfo.largestFile) {
      md += `- **Largest File:** \`${projectInfo.largestFile.name}\` (${(projectInfo.largestFile.size / 1024).toFixed(1)} KB)\n`;
    }
    md += `- **Extension Stats:**\n`;
    for (const [ext, cnt] of Object.entries(projectInfo.extensionStats || {})) {
      md += `  - \`${ext}\`: ${cnt}\n`;
    }
    md += `\n`;
  }

  md += `## Severity Summary\n\n`;
  md += `| Severity | Count |\n`;
  md += `| :--- | :--- |\n`;
  md += `| 🛑 **Critical** | ${severityCount.critical} |\n`;
  md += `| 🟠 **High** | ${severityCount.high} |\n`;
  md += `| 🟡 **Medium** | ${severityCount.medium} |\n`;
  md += `| 🔵 **Low** | ${severityCount.low} |\n\n`;

  md += `## Findings Details\n\n`;
  if (findings.length === 0) {
    md += `✨ No security vulnerabilities or suspicious patterns found! Good job.\n`;
  } else {
    md += `| File | Line | Rule | Severity | Matched Code |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    findings.forEach(f => {
      const relPath = path.relative(targetDirectory, f.filePath);
      const codeSnippet = f.lineContent.length > 80 ? f.lineContent.slice(0, 80) + '...' : f.lineContent;
      const emoji = f.severity === 'critical' ? '🛑' : f.severity === 'high' ? '🟠' : f.severity === 'medium' ? '🟡' : '🔵';
      md += `| \`${escapeHtml(relPath)}\` | ${f.lineNumber} | **${escapeHtml(f.ruleId)}** (${escapeHtml(f.ruleName)}) | ${emoji} ${f.severity.toUpperCase()} | \`${escapeHtml(codeSnippet)}\` |\n`;
    });
  }

  return md;
}

function generateHTML(reportData) {
  const { scanDate, targetDirectory, scannedFiles, systemInfo, projectInfo, findings } = reportData;

  const severityCount = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach(f => {
    const sev = f.severity.toLowerCase();
    if (severityCount[sev] !== undefined) {
      severityCount[sev]++;
    }
  });

  let systemInfoHtml = '';
  if (systemInfo) {
    systemInfoHtml = `
      <div class="system-meta">
        <span>OS: <strong>${escapeHtml(systemInfo.os)} (${escapeHtml(systemInfo.platform)})</strong></span>
        <span>Arch: <strong>${escapeHtml(systemInfo.architecture)}</strong></span>
        <span>Node: <strong>${escapeHtml(systemInfo.nodeVersion)}</strong></span>
        <span>Host: <strong>${escapeHtml(systemInfo.hostname)}</strong></span>
      </div>
    `;
  }

  let projectInfoHtml = '';
  if (projectInfo) {
    const extListHtml = Object.entries(projectInfo.extensionStats || {})
      .map(([ext, val]) => `<li><span>${escapeHtml(ext)}</span><strong>${val}</strong></li>`)
      .join('');

    const largestFileHtml = projectInfo.largestFile 
      ? `<div>Largest File: <strong>${escapeHtml(projectInfo.largestFile.name)}</strong> (${(projectInfo.largestFile.size / 1024).toFixed(1)} KB)</div>`
      : '';

    projectInfoHtml = `
      <div class="project-stats-card">
        <h3>Project Statistics</h3>
        <div class="stats-row">
          <div>Files: <strong>${projectInfo.totalFiles}</strong></div>
          <div>Folders: <strong>${projectInfo.totalFolders}</strong></div>
          ${largestFileHtml}
        </div>
        <ul class="ext-stats">
          ${extListHtml}
        </ul>
      </div>
    `;
  }

  const findingsListHtml = findings.map((f, idx) => {
    const relPath = path.relative(targetDirectory, f.filePath);
    const escapedLine = escapeHtml(f.lineContent);
    const escapedMatch = escapeHtml(f.matchedText);
    
    let highlightedLine = escapedLine;
    if (escapedMatch) {
      // Highlight occurrences of the match
      highlightedLine = escapedLine.replace(
        new RegExp(escapedMatch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
        `<mark class="code-highlight">${escapedMatch}</mark>`
      );
    }

    return `
      <tr class="finding-row" data-severity="${f.severity.toLowerCase()}" data-search="${escapeHtml(relPath.toLowerCase())} ${escapeHtml(f.ruleId.toLowerCase())} ${escapeHtml(f.ruleName.toLowerCase())}">
        <td class="severity-col">
          <span class="severity-badge sev-${f.severity.toLowerCase()}">${f.severity.toUpperCase()}</span>
        </td>
        <td class="rule-col">
          <div class="rule-id">${escapeHtml(f.ruleId)}</div>
          <div class="rule-name">${escapeHtml(f.ruleName)}</div>
        </td>
        <td class="file-col">
          <div class="file-path">${escapeHtml(relPath)}</div>
          <div class="file-line">Line ${f.lineNumber}</div>
        </td>
        <td class="code-col">
          <pre class="code-box"><code>${highlightedLine}</code></pre>
          <div class="rule-desc">${escapeHtml(f.description)}</div>
        </td>
      </tr>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevVirus Scan Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #0b0f19;
      --card-bg: rgba(22, 30, 49, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      
      --color-critical: #ef4444;
      --color-high: #f97316;
      --color-medium: #f59e0b;
      --color-low: #3b82f6;
      
      --bg-critical: rgba(239, 68, 68, 0.15);
      --bg-high: rgba(249, 115, 22, 0.15);
      --bg-medium: rgba(245, 158, 11, 0.15);
      --bg-low: rgba(59, 130, 246, 0.15);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-color);
      background-image: 
        radial-gradient(at 10% 10%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
        radial-gradient(at 90% 10%, rgba(239, 68, 68, 0.1) 0px, transparent 50%),
        radial-gradient(at 50% 90%, rgba(245, 158, 11, 0.08) 0px, transparent 50%);
      color: var(--text-main);
      min-height: 100vh;
      padding: 2rem 1.5rem;
      line-height: 1.5;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Header styling */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--card-border);
    }

    .logo-area h1 {
      font-size: 2.2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #60a5fa, #f87171);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.25rem;
      letter-spacing: -0.5px;
    }

    .logo-area p {
      font-size: 0.95rem;
      color: var(--text-muted);
    }

    .meta-area {
      text-align: right;
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    .meta-area strong {
      color: var(--text-main);
    }

    /* Overview Cards */
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .stat-card h3 {
      font-size: 0.9rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .stat-card .value {
      font-size: 2.5rem;
      font-weight: 700;
    }

    .stat-card.critical .value { color: var(--color-critical); }
    .stat-card.high .value { color: var(--color-high); }
    .stat-card.medium .value { color: var(--color-medium); }
    .stat-card.low .value { color: var(--color-low); }

    /* Interactive Filters & Search */
    .controls {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 2rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .filter-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .filter-btn.active {
      background: #f3f4f6;
      color: #111827;
      font-weight: 600;
    }

    .search-input {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      font-size: 0.9rem;
      width: 100%;
      max-width: 320px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: #60a5fa;
    }

    /* Findings Table */
    .findings-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--card-border);
    }

    td {
      padding: 1.25rem;
      border-bottom: 1px solid var(--card-border);
      vertical-align: top;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr.finding-row {
      transition: background-color 0.2s;
    }

    tr.finding-row:hover {
      background: rgba(255, 255, 255, 0.01);
    }

    .severity-badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .sev-critical { background: var(--bg-critical); color: var(--color-critical); border: 1px solid rgba(239, 68, 68, 0.3); }
    .sev-high { background: var(--bg-high); color: var(--color-high); border: 1px solid rgba(249, 115, 22, 0.3); }
    .sev-medium { background: var(--bg-medium); color: var(--color-medium); border: 1px solid rgba(245, 158, 11, 0.3); }
    .sev-low { background: var(--bg-low); color: var(--color-low); border: 1px solid rgba(59, 130, 246, 0.3); }

    .rule-id {
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 0.15rem;
    }

    .rule-name {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .file-path {
      font-weight: 500;
      color: var(--text-main);
      word-break: break-all;
      margin-bottom: 0.15rem;
    }

    .file-line {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .code-box {
      background: #07090e;
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 6px;
      padding: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      overflow-x: auto;
      margin-bottom: 0.5rem;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .code-highlight {
      background: rgba(239, 68, 68, 0.35);
      color: #fff;
      padding: 0.1rem 0.2rem;
      border-radius: 2px;
      font-weight: bold;
    }

    .rule-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
    }

    .empty-state .emoji {
      font-size: 3.5rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .meta-area {
        text-align: left;
      }
      table, thead, tbody, th, td, tr {
        display: block;
      }
      th {
        display: none;
      }
      td {
        border-bottom: none;
        padding: 0.75rem 1.25rem;
      }
      tr {
        border-bottom: 1.5px solid var(--card-border);
        padding: 1rem 0;
      }
      td:first-child {
        padding-top: 0.5rem;
      }
      td:last-child {
        padding-bottom: 1rem;
      }
    }
    .system-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.75rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .system-meta span {
      background: rgba(255, 255, 255, 0.04);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--card-border);
    }
    .project-stats-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 2rem;
      backdrop-filter: blur(12px);
    }
    .project-stats-card h3 {
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }
    .stats-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 0.75rem;
    }
    .ext-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      list-style: none;
    }
    .ext-stats li {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      display: flex;
      gap: 0.5rem;
    }
    .ext-stats li span {
      color: var(--text-muted);
    }
    .ext-stats li strong {
      color: #60a5fa;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">
        <h1>DevVirus Report</h1>
        <p>Static code analysis & security findings</p>
        ${systemInfoHtml}
      </div>
      <div class="meta-area">
        <div>Target Directory: <strong>${escapeHtml(targetDirectory)}</strong></div>
        <div>Date: <strong>${escapeHtml(scanDate)}</strong></div>
        <div>Scanned Files: <strong>${scannedFiles}</strong></div>
      </div>
    </header>

    <div class="overview-grid">
      <div class="stat-card">
        <h3>Total Issues</h3>
        <div class="value" id="tot-issues-val">${findings.length}</div>
      </div>
      <div class="stat-card critical">
        <h3>Critical</h3>
        <div class="value">${severityCount.critical}</div>
      </div>
      <div class="stat-card high">
        <h3>High</h3>
        <div class="value">${severityCount.high}</div>
      </div>
      <div class="stat-card medium">
        <h3>Medium</h3>
        <div class="value">${severityCount.medium}</div>
      </div>
      <div class="stat-card low">
        <h3>Low</h3>
        <div class="value">${severityCount.low}</div>
      </div>
    </div>

    \${projectInfoHtml}

    <div class="controls">
      <div class="filter-group">
        <button class="filter-btn active" onclick="filterSeverity('all', this)">All</button>
        <button class="filter-btn" onclick="filterSeverity('critical', this)">Critical (${severityCount.critical})</button>
        <button class="filter-btn" onclick="filterSeverity('high', this)">High (${severityCount.high})</button>
        <button class="filter-btn" onclick="filterSeverity('medium', this)">Medium (${severityCount.medium})</button>
        <button class="filter-btn" onclick="filterSeverity('low', this)">Low (${severityCount.low})</button>
      </div>
      <input type="text" class="search-input" placeholder="Search by file or rule..." oninput="handleSearch(this.value)">
    </div>

    <div class="findings-card">
      ${findings.length === 0 ? `
        <div class="empty-state">
          <div class="emoji">🎉</div>
          <h3>Clean Bill of Health!</h3>
          <p>No vulnerabilities, warnings, or hardcoded secrets found in this scan.</p>
        </div>
      ` : `
        <table id="findings-table">
          <thead>
            <tr>
              <th style="width: 120px;">Severity</th>
              <th style="width: 200px;">Rule</th>
              <th style="width: 280px;">Location</th>
              <th>Details & Source</th>
            </tr>
          </thead>
          <tbody>
            ${findingsListHtml}
          </tbody>
        </table>
      `}
    </div>
  </div>

  <script>
    let activeFilter = 'all';
    let searchQuery = '';

    function filterSeverity(sev, btn) {
      activeFilter = sev;
      
      // Update active state class
      document.querySelectorAll('.filter-btn').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      
      applyFilters();
    }

    function handleSearch(query) {
      searchQuery = query.toLowerCase().trim();
      applyFilters();
    }

    function applyFilters() {
      const rows = document.querySelectorAll('.finding-row');
      let visibleCount = 0;

      rows.forEach(row => {
        const sevMatch = (activeFilter === 'all' || row.dataset.severity === activeFilter);
        const searchMatch = (!searchQuery || row.dataset.search.includes(searchQuery));

        if (sevMatch && searchMatch) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });
      
      // Dynamic counter update
      const totVal = document.getElementById('tot-issues-val');
      if (totVal) {
        totVal.textContent = visibleCount;
      }
    }
  </script>
</body>
</html>`;
}

function writeReport(filePath, format, reportData) {
  let content = '';
  switch (format.toLowerCase()) {
    case 'json':
      content = generateJSON(reportData);
      break;
    case 'markdown':
    case 'md':
      content = generateMarkdown(reportData);
      break;
    case 'html':
    default:
      content = generateHTML(reportData);
      break;
  }
  
  const absolutePath = path.resolve(filePath);
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(absolutePath, content, 'utf8');
}

module.exports = {
  generateJSON,
  generateMarkdown,
  generateHTML,
  writeReport
};
