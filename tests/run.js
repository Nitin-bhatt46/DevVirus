const fs = require('fs');
const path = require('path');
const { getRules } = require('../src/crud/rules');
const { scanDirectory } = require('../src/scanner/engine');
const { writeReport } = require('../src/report/reporter');
const { scanSystem } = require('../src/scanner/systemScanner');
const { scanEnvironment } = require('../src/scanner/environmentScanner');
const { scanProject } = require('../src/scanner/projectScanner');
const { generateCombinedReport } = require('../src/report/combinedReporter');
const crud = require('../src/crud/crudEngine');
const logger = require('../src/logger/logger');

const MOCK_DIR = path.join(__dirname, 'mock_project');

const MOCK_FILES = {
  'clean.js': `// A safe file
function greet(name) {
  return "Hello, " + name + "!";
}
console.log(greet("Developer"));
`,
  'secrets.js': `// Hardcoded API Key Test
const api_key = "AIzaSyD-xyz1234567890abcdefghij";
const config = {
  db_password: 'superSecretPassword123!',
  auth: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
};
`,
  'danger_eval.js': `// Unsafe eval execution
function parseInput(data) {
  return eval("(" + data + ")");
}
const creator = new Function('a', 'b', 'return a + b');
`,
  'exec_cmd.js': `// Insecure execution
const cp = require('child_process');
cp.exec('ping ' + host, (err, out) => {
  console.log(out);
});
const val = cp.execSync('whoami');
`,
  'crypto_weak.js': `// Weak hash algorithms
const crypto = require('crypto');
const md5Hash = crypto.createHash('md5').update('data').digest('hex');
const sha1Hash = crypto.createHash('sha1').update('data').digest('hex');
`,
  'permissions.js': `// Weak file permission check
const fs = require('fs');
fs.chmodSync('config.json', '777');
fs.chmod('data.txt', 0o777, () => {});
`,
  'payload.js': `// Obfuscated payload
const secretPayload = "dGhpcyBpcyBhIHZlcnkgbG9uZyBiYXNlNjQgc3RyaW5nIHRoYXQgc2hvdWxkIGJlIGZsYWdnZWQgYXMgYSBwb3RlbnRpYWwgbWFsaWNpb3VzIHBheWxvYWQgYmVjYXVzZSBpdCBleGNlZWRzIHRoZSBkZWZhdWx0IDIwMCBjaGFyYWN0ZXIgbGltaXQgYW5kIGNvbnRhaW5zIHJhbmRvbSBsb29raW5nIGJpbmFyeSBkYXRh";
`,
  // Node modules file - should be ignored
  'node_modules/some_lib/vulnerable.js': `// Inside node_modules, should not be scanned
eval("secret_payload");
`,
  // Git file - should be ignored
  '.git/hooks/pre-commit': `// Git hook, should be ignored
password="admin"
`
};

function setupMockProject() {
  if (fs.existsSync(MOCK_DIR)) {
    fs.rmSync(MOCK_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(MOCK_DIR, { recursive: true });

  for (const [filename, content] of Object.entries(MOCK_FILES)) {
    const filePath = path.join(MOCK_DIR, filename);
    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

async function runTests() {
  logger.banner();
  logger.info("Initializing mock project for scanning tests...");
  setupMockProject();
  logger.success("Mock project created at: " + MOCK_DIR);

  logger.info("Running System, Environment, and Project Scanners...");
  const sysInfo = scanSystem();
  const envInfo = scanEnvironment();
  const projInfo = scanProject(MOCK_DIR);

  console.log(logger.colors.dim(JSON.stringify({ system: sysInfo, environment: envInfo, project: projInfo }, null, 2)));

  logger.info("Executing CRUD Engine Validation tests...");
  const testCrudPath = path.join(MOCK_DIR, 'crud_test_file.txt');
  
  const createRes = crud.createFile(testCrudPath, "Hello CRUD");
  const createFailRes = crud.createFile(testCrudPath, "Fail me"); // should fail because already exists
  
  const readRes = crud.readFile(testCrudPath);
  
  const updateRes = crud.updateFile(testCrudPath, " - Updated content", true); // append
  const readRes2 = crud.readFile(testCrudPath);
  
  const deleteRes = crud.deleteFile(testCrudPath);
  const readResFail = crud.readFile(testCrudPath); // should fail because deleted

  console.log(logger.colors.dim(JSON.stringify({
    createRes,
    createFailRes,
    readRes,
    updateRes,
    readRes2,
    deleteRes,
    readResFail
  }, null, 2)));

  logger.info("Executing Combined Status Report Generation...");
  const combinedTestPath = path.join(__dirname, 'test-combined-report.json');
  const combinedRes = generateCombinedReport(combinedTestPath, MOCK_DIR);

  let combinedReportExists = fs.existsSync(combinedTestPath);
  let parsedCombinedReport = null;
  if (combinedReportExists) {
    try {
      parsedCombinedReport = JSON.parse(fs.readFileSync(combinedTestPath, 'utf8'));
    } catch(e) {
      combinedReportExists = false;
    }
  }

  logger.info("Retrieving system scan rules...");
  const rules = getRules();

  logger.info("Running scan directory walker...");
  const { scannedFiles, findings } = await scanDirectory(MOCK_DIR, rules);

  logger.success(`Scan completed. Scanned ${scannedFiles} files. Found ${findings.length} issues.`);

  const mutLogPath = path.join(process.cwd(), 'logs', 'mutation-log.json');
  let mutLogsExist = fs.existsSync(mutLogPath);
  let parsedMutLogs = [];
  if (mutLogsExist) {
    try {
      parsedMutLogs = JSON.parse(fs.readFileSync(mutLogPath, 'utf8'));
    } catch(e) {
      mutLogsExist = false;
    }
  }

  // Validation Checks
  const tests = [
    {
      name: "Should scan exactly 7 files (skipping node_modules and .git)",
      passed: scannedFiles === 7
    },
    {
      name: "Should detect hardcoded secrets (DV-001)",
      passed: findings.some(f => f.ruleId === 'DV-001')
    },
    {
      name: "Should detect dangerous code executions (DV-002)",
      passed: findings.some(f => f.ruleId === 'DV-002')
    },
    {
      name: "Should detect insecure command executions (DV-003)",
      passed: findings.some(f => f.ruleId === 'DV-003')
    },
    {
      name: "Should detect weak cryptography (DV-004)",
      passed: findings.some(f => f.ruleId === 'DV-004')
    },
    {
      name: "Should detect insecure permissions (DV-005)",
      passed: findings.some(f => f.ruleId === 'DV-005')
    },
    {
      name: "Should detect obfuscated payloads (DV-006)",
      passed: findings.some(f => f.ruleId === 'DV-006')
    },
    {
      name: "Should successfully harvest system information keys (os, platform, architecture, hostname, homeDirectory)",
      passed: sysInfo && 'os' in sysInfo && 'platform' in sysInfo && 'architecture' in sysInfo && 'hostname' in sysInfo && 'homeDirectory' in sysInfo
    },
    {
      name: "Should successfully harvest environment variables (nodeVersion)",
      passed: envInfo && 'nodeVersion' in envInfo
    },
    {
      name: "Should successfully harvest project statistics (totalFiles, totalFolders, largestFile, extensionStats)",
      passed: projInfo && 'totalFiles' in projInfo && 'totalFolders' in projInfo && 'largestFile' in projInfo && 'extensionStats' in projInfo
    },
    {
      name: "Should correctly verify project stats files count (> 0)",
      passed: projInfo && projInfo.totalFiles > 0
    },
    {
      name: "CRUD: createFile should succeed first and fail on duplicate path",
      passed: createRes.success === true && createFailRes.success === false
    },
    {
      name: "CRUD: readFile should retrieve exact content",
      passed: readRes.success === true && readRes.data.content === "Hello CRUD"
    },
    {
      name: "CRUD: updateFile should support appending content correctly",
      passed: updateRes.success === true && readRes2.data.content === "Hello CRUD - Updated content"
    },
    {
      name: "CRUD: deleteFile should succeed and subsequent readFile should fail gracefully",
      passed: deleteRes.success === true && readResFail.success === false
    },
    {
      name: "Mutation Log: logs/mutation-log.json must exist",
      passed: mutLogsExist
    },
    {
      name: "Mutation Log: should contain correct entries representing the file CRUD transactions",
      passed: parsedMutLogs.length >= 7 && parsedMutLogs.every(entry => 'timestamp' in entry && 'operation' in entry && 'file' in entry && 'status' in entry)
    },
    {
      name: "Combined Report: test-combined-report.json must be written and be valid JSON",
      passed: combinedReportExists && parsedCombinedReport !== null
    },
    {
      name: "Combined Report: should integrate systemInfo, environmentInfo, projectAnalysis, and mutationHistory",
      passed: parsedCombinedReport && 
              'systemInfo' in parsedCombinedReport && 
              'environmentInfo' in parsedCombinedReport && 
              'projectAnalysis' in parsedCombinedReport && 
              'mutationHistory' in parsedCombinedReport
    }
  ];

  console.log(`\n${logger.colors.bold('TEST VALIDATION RESULTS:')}`);
  let allPassed = true;
  
  tests.forEach(test => {
    if (test.passed) {
      console.log(`  ${logger.colors.green('✓')} ${test.name}`);
    } else {
      console.log(`  ${logger.colors.red('✗')} ${test.name}`);
      allPassed = false;
    }
  });

  // Verify report generation
  logger.info("\nVerifying report formats generation...");
  const reportData = {
    scanDate: new Date().toLocaleString(),
    targetDirectory: MOCK_DIR,
    scannedFiles,
    systemInfo: {
      os: sysInfo.os,
      architecture: sysInfo.architecture,
      hostname: sysInfo.hostname,
      platform: sysInfo.platform,
      homeDirectory: sysInfo.homeDirectory,
      nodeVersion: envInfo.nodeVersion,
      envMode: envInfo.envMode
    },
    projectInfo: {
      totalFiles: projInfo.totalFiles,
      totalFolders: projInfo.totalFolders,
      largestFile: projInfo.largestFile,
      extensionStats: projInfo.extensionStats
    },
    findings
  };

  try {
    writeReport(path.join(__dirname, 'test-report.html'), 'html', reportData);
    writeReport(path.join(__dirname, 'test-report.json'), 'json', reportData);
    writeReport(path.join(__dirname, 'test-report.md'), 'markdown', reportData);
    logger.success("HTML, JSON, and Markdown reports created successfully in tests/ directory.");
  } catch (err) {
    logger.error("Failed to generate test reports: " + err.message);
    allPassed = false;
  }

  if (allPassed) {
    console.log(`\n${logger.colors.bold(logger.colors.green(' SUCCESS '))} All DevVirus validation tests passed successfully!\n`);
    process.exit(0);
  } else {
    console.log(`\n${logger.colors.bold(logger.colors.bgRed(' FAILED '))} Some validation checks failed.\n`);
    process.exit(1);
  }
}

runTests();
