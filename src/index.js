#!/usr/bin/env node

const path = require('path');
const logger = require('./logger/logger');
const { getRules, addRule, updateRule, deleteRule, resetRules } = require('./crud/rules');
const { scanDirectory } = require('./scanner/engine');
const { writeReport } = require('./report/reporter');
const { scanSystem } = require('./scanner/systemScanner');
const { scanEnvironment } = require('./scanner/environmentScanner');
const { scanProject } = require('./scanner/projectScanner');

function parseArgs(args) {
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextVal = args[i + 1];
      if (nextVal && !nextVal.startsWith('--')) {
        flags[key] = nextVal;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function showHelp() {
  logger.banner();
  console.log(`${logger.colors.bold('USAGE')}`);
  console.log("  node src/index.js <command> [options]");
  console.log();
  console.log(`${logger.colors.bold('COMMANDS')}`);
  console.log("  scan [dir]                  Scan code files in target directory (default: '.')");
  console.log("  rule list                   List all active and inactive rules");
  console.log("  rule add [options]          Add a new pattern matching rule");
  console.log("  rule update <id> [options]  Update fields in an existing rule");
  console.log("  rule delete <id>            Delete a rule by its ID");
  console.log("  rule reset                  Revert rules database to system defaults");
  console.log("  report [dir]                Generate report.json combining system, env, project, and mutations stats");
  console.log("  create <file> [options]     Create a file safely (with --content option)");
  console.log("  read <file>                 Read file contents safely");
  console.log("  update <file> [options]     Update file content (with --content and --append options)");
  console.log("  delete <file>               Delete a file safely");
  console.log();
  console.log(`${logger.colors.bold('SCAN OPTIONS')}`);
  console.log("  --format <html|json|md>     Report format (default: html)");
  console.log("  --out <filename>            Save report output to path (default: report.<format>)");
  console.log("  --severity <level>          Minimum severity to report: low|medium|high|critical (default: low)");
  console.log();
  console.log(`${logger.colors.bold('RULE OPTIONS')}`);
  console.log("  --id <id>                   Unique identifier (e.g., DV-101)");
  console.log("  --name <name>               Friendly rule description name");
  console.log("  --pattern <regex>           Regex string to match for vulnerability");
  console.log("  --flags <regex-flags>       Regular expression flags, e.g. gi, g (default: g)");
  console.log("  --severity <level>          Severity of issues matched: low|medium|high|critical");
  console.log("  --description <desc>        Full context explanation of this rule");
  console.log("  --enabled <true|false>      Turn rule on or off (during rule update)");
  console.log();
  console.log(`${logger.colors.bold('EXAMPLES')}`);
  console.log("  $ node src/index.js scan ./src --severity high --format html");
  console.log("  $ node src/index.js rule add --id DV-007 --name \"Insecure WS\" --pattern \"ws://\" --severity medium");
  console.log("  $ node src/index.js rule update DV-007 --enabled false");
  console.log("  $ node src/index.js report ./src --out my-report.json");
  console.log("  $ node src/index.js create file.txt --content \"Hello\"");
  console.log("  $ node src/index.js read file.txt");
  console.log("  $ node src/index.js update file.txt --content \" World\" --append");
  console.log("  $ node src/index.js delete file.txt");
  console.log();
}

async function handleScan(targetDir, flags) {
  const scanDir = targetDir || '.';
  const format = flags.format || 'html';
  const defaultOut = `report.${format === 'markdown' ? 'md' : format}`;
  const outPath = flags.out || defaultOut;
  const minSeverity = flags.severity || 'low';

  const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
  const minLevel = severityLevels[minSeverity.toLowerCase()] !== undefined 
    ? severityLevels[minSeverity.toLowerCase()] 
    : 0;

  logger.info(`Starting scan in: ${path.resolve(scanDir)}`);
  logger.info(`Minimum severity: ${minSeverity.toUpperCase()}`);

  const sysInfo = scanSystem();
  const envInfo = scanEnvironment();
  const projInfo = scanProject(scanDir);

  logger.info(`System: ${sysInfo.os || 'Unknown'} (${sysInfo.platform || 'Unknown'}) | Arch: ${sysInfo.architecture || 'Unknown'} | Node: ${envInfo.nodeVersion || 'Unknown'}`);
  logger.info(`Project: Files: ${projInfo.totalFiles} | Folders: ${projInfo.totalFolders} | Largest: ${projInfo.largestFile ? projInfo.largestFile.name : 'None'}`);

  const rules = getRules();
  const activeRules = rules.filter(r => r.enabled);
  logger.info(`Loaded ${activeRules.length} active rule configurations.`);

  let result;
  try {
    result = await scanDirectory(scanDir, rules, (file, current, total) => {
      const pct = Math.round((current / total) * 100);
      const filename = path.basename(file);
      const displayFile = filename.length > 25 ? filename.slice(0, 22) + '...' : filename;
      process.stdout.write(`\r${logger.colors.cyan('[SCANNING]')} Progress: ${current}/${total} (${pct}%) | Current: ${displayFile}\x1b[K`);
    });
  } catch (err) {
    logger.error(`Scan error: ${err.message}`);
    process.exit(1);
  }

  // Clear progress line
  process.stdout.write('\r\x1b[K');

  const { scannedFiles, findings } = result;

  // Filter findings based on severity level
  const filteredFindings = findings.filter(f => {
    const lvl = severityLevels[f.severity.toLowerCase()] !== undefined 
      ? severityLevels[f.severity.toLowerCase()] 
      : 0;
    return lvl >= minLevel;
  });

  logger.success(`Scan completed. Inspected ${scannedFiles} files.`);
  logger.info(`Found ${filteredFindings.length} issue(s) at or above "${minSeverity.toUpperCase()}" level.`);

  // Print console report table
  if (filteredFindings.length > 0) {
    const headers = ['Severity', 'File & Line', 'Rule ID', 'Match', 'Description'];
    const rows = filteredFindings.map(f => {
      const relFile = path.relative(scanDir, f.filePath);
      const loc = `${relFile}:${f.lineNumber}`;
      const shortLoc = loc.length > 30 ? '...' + loc.slice(-27) : loc;

      const sevColor = f.severity === 'critical' ? logger.colors.red(f.severity.toUpperCase())
                     : f.severity === 'high' ? logger.colors.yellow(f.severity.toUpperCase())
                     : f.severity === 'medium' ? logger.colors.cyan(f.severity.toUpperCase())
                     : logger.colors.blue(f.severity.toUpperCase());

      const matchText = f.matchedText.trim();
      const shortMatch = matchText.length > 25 ? matchText.slice(0, 22) + '...' : matchText;
      const desc = f.description.length > 35 ? f.description.slice(0, 32) + '...' : f.description;

      return [
        sevColor,
        shortLoc,
        logger.colors.bold(f.ruleId),
        logger.colors.gray(shortMatch),
        desc
      ];
    });

    console.log();
    logger.table(headers, rows);
    console.log();
  }

  // Write report file
  try {
    const reportData = {
      scanDate: new Date().toLocaleString(),
      targetDirectory: path.resolve(scanDir),
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
      findings: filteredFindings
    };

    writeReport(outPath, format, reportData);
    logger.success(`Report file written to: ${path.resolve(outPath)}`);
  } catch (err) {
    logger.error(`Failed to write report file: ${err.message}`);
  }

  // Exit with 1 if critical/high vulnerabilities exist, otherwise 0
  const hasCriticalOrHigh = filteredFindings.some(f => ['critical', 'high'].includes(f.severity.toLowerCase()));
  process.exit(hasCriticalOrHigh ? 1 : 0);
}

function handleRuleCommand(positional, flags) {
  const subCommand = positional[1];

  switch (subCommand) {
    case 'list': {
      const rules = getRules();
      const headers = ['ID', 'Rule Name', 'Severity', 'Status', 'Pattern'];
      const rows = rules.map(r => {
        const status = r.enabled ? logger.colors.green('Enabled') : logger.colors.gray('Disabled');
        const sevColor = r.severity === 'critical' ? logger.colors.red(r.severity.toUpperCase())
                       : r.severity === 'high' ? logger.colors.yellow(r.severity.toUpperCase())
                       : r.severity === 'medium' ? logger.colors.cyan(r.severity.toUpperCase())
                       : logger.colors.blue(r.severity.toUpperCase());

        const pat = r.pattern.length > 35 ? r.pattern.slice(0, 32) + '...' : r.pattern;
        return [r.id, r.name, sevColor, status, pat];
      });
      console.log(`\n${logger.colors.bold('ACTIVE VULNERABILITY RULES')}`);
      logger.table(headers, rows);
      console.log();
      break;
    }
    case 'add': {
      if (!flags.id || !flags.name || !flags.pattern) {
        logger.error('Missing required rule options: --id, --name, and --pattern are required.');
        process.exit(1);
      }
      try {
        const added = addRule({
          id: flags.id,
          name: flags.name,
          pattern: flags.pattern,
          flags: flags.flags || 'g',
          severity: flags.severity || 'medium',
          description: flags.description || ''
        });
        logger.success(`Successfully added rule "${added.id}" (${added.name}).`);
      } catch (err) {
        logger.error(err.message);
        process.exit(1);
      }
      break;
    }
    case 'update': {
      const ruleId = positional[2];
      if (!ruleId) {
        logger.error('Rule ID is required. Usage: node src/index.js rule update <id> [options]');
        process.exit(1);
      }

      let enabled = undefined;
      if (flags.enabled === 'true') enabled = true;
      if (flags.enabled === 'false') enabled = false;

      const fields = {};
      if (flags.name) fields.name = flags.name;
      if (flags.pattern) fields.pattern = flags.pattern;
      if (flags.flags) fields.flags = flags.flags;
      if (flags.severity) fields.severity = flags.severity;
      if (flags.description) fields.description = flags.description;
      if (enabled !== undefined) fields.enabled = enabled;

      if (Object.keys(fields).length === 0) {
        logger.error('No update options provided. Please specify fields like --severity, --enabled, etc.');
        process.exit(1);
      }

      try {
        const updated = updateRule(ruleId, fields);
        logger.success(`Successfully updated rule "${updated.id}".`);
      } catch (err) {
        logger.error(err.message);
        process.exit(1);
      }
      break;
    }
    case 'delete': {
      const ruleId = positional[2];
      if (!ruleId) {
        logger.error('Rule ID is required. Usage: node src/index.js rule delete <id>');
        process.exit(1);
      }
      try {
        deleteRule(ruleId);
        logger.success(`Successfully deleted rule "${ruleId}".`);
      } catch (err) {
        logger.error(err.message);
        process.exit(1);
      }
      break;
    }
    case 'reset': {
      try {
        resetRules();
        logger.success('Successfully reset all rules to defaults.');
      } catch (err) {
        logger.error(err.message);
        process.exit(1);
      }
      break;
    }
    default:
      logger.error(`Unknown rule subcommand "${subCommand}".`);
      showHelp();
      process.exit(1);
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  if (!command || flags.help || flags.h || command === 'help') {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case 'scan':
      await handleScan(positional[1], flags);
      break;
    case 'rule':
    case 'rules':
      handleRuleCommand(positional, flags);
      break;
    case 'report': {
      const outReportPath = flags.out || 'report.json';
      const targetProjectDir = positional[1] || '.';
      const { generateCombinedReport } = require('./report/combinedReporter');
      logger.info(`Compiling combined status report...`);
      const repResult = generateCombinedReport(outReportPath, targetProjectDir);
      if (repResult.success) {
        logger.success(`Combined status report successfully generated at: ${repResult.path}`);
        process.exit(0);
      } else {
        logger.error(`Failed to generate combined report: ${repResult.error}`);
        process.exit(1);
      }
      break;
    }
    case 'create': {
      const filePath = positional[1];
      if (!filePath) {
        logger.error('File path is required. Usage: node src/index.js create <filePath> [--content "text"]');
        process.exit(1);
      }
      const content = flags.content || '';
      const { createFile } = require('./crud/crudEngine');
      const res = createFile(filePath, content);
      if (res.success) {
        logger.success(`File successfully created at: ${res.data.path} (Size: ${res.data.size} bytes)`);
        process.exit(0);
      } else {
        logger.error(`Failed to create file: ${res.error}`);
        process.exit(1);
      }
      break;
    }
    case 'read': {
      const filePath = positional[1];
      if (!filePath) {
        logger.error('File path is required. Usage: node src/index.js read <filePath>');
        process.exit(1);
      }
      const { readFile } = require('./crud/crudEngine');
      const res = readFile(filePath);
      if (res.success) {
        logger.success(`File successfully read from: ${res.data.path} (Size: ${res.data.size} bytes)`);
        console.log(`\n${logger.colors.dim('--- FILE CONTENT START ---')}`);
        console.log(res.data.content);
        console.log(`${logger.colors.dim('--- FILE CONTENT END ---')}\n`);
        process.exit(0);
      } else {
        logger.error(`Failed to read file: ${res.error}`);
        process.exit(1);
      }
      break;
    }
    case 'update': {
      const filePath = positional[1];
      if (!filePath) {
        logger.error('File path is required. Usage: node src/index.js update <filePath> [--content "text"] [--append]');
        process.exit(1);
      }
      const content = flags.content || '';
      const append = !!flags.append;
      const { updateFile } = require('./crud/crudEngine');
      const res = updateFile(filePath, content, append);
      if (res.success) {
        logger.success(`File successfully updated at: ${res.data.path} (New Size: ${res.data.size} bytes)`);
        process.exit(0);
      } else {
        logger.error(`Failed to update file: ${res.error}`);
        process.exit(1);
      }
      break;
    }
    case 'delete': {
      const filePath = positional[1];
      if (!filePath) {
        logger.error('File path is required. Usage: node src/index.js delete <filePath>');
        process.exit(1);
      }
      const { deleteFile } = require('./crud/crudEngine');
      const res = deleteFile(filePath);
      if (res.success) {
        logger.success(`File successfully deleted: ${res.data.path}`);
        process.exit(0);
      } else {
        logger.error(`Failed to delete file: ${res.error}`);
        process.exit(1);
      }
      break;
    }
    default:
      logger.error(`Unknown command "${command}".`);
      showHelp();
      process.exit(1);
  }
}

main();
