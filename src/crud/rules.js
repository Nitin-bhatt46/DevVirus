const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.devvirus');
const RULES_FILE = path.join(CONFIG_DIR, 'rules.json');

const DEFAULT_RULES = [
  {
    id: "DV-001",
    name: "Hardcoded API Secret",
    description: "Detects potential hardcoded credentials, API keys, client secrets, and auth tokens.",
    pattern: "(api[_-]?key|secret|password|private[_-]?key|auth[_-]?token|bearer)\\s*[:=]\\s*['\"`][a-zA-Z0-9_\\-+=]{10,}['\"`]",
    flags: "gi",
    severity: "high",
    enabled: true
  },
  {
    id: "DV-002",
    name: "Dangerous Code Execution",
    description: "Detects usage of eval() or new Function() which can lead to arbitrary code execution.",
    pattern: "\\b(eval|new\\s+Function)\\s*\\(",
    flags: "g",
    severity: "critical",
    enabled: true
  },
  {
    id: "DV-003",
    name: "Insecure Command Execution",
    description: "Detects command execution functions which may be vulnerable to command injection.",
    pattern: "\\b(child_process\\.exec|child_process\\.execSync|\\.exec|\\.execSync)\\s*\\(",
    flags: "g",
    severity: "medium",
    enabled: true
  },
  {
    id: "DV-004",
    name: "Weak Cryptography",
    description: "Detects weak hash algorithms like MD5 or SHA1 which are vulnerable to collision attacks.",
    pattern: "createHash\\s*\\(\\s*['\"`](md5|sha1)['\"`]\\s*\\)",
    flags: "gi",
    severity: "medium",
    enabled: true
  },
  {
    id: "DV-005",
    name: "Insecure File Permissions",
    description: "Detects dangerous file permissions (e.g., chmod 777) making files globally readable/writable/executable.",
    pattern: "(chmodSync|chmod)\\s*\\(\\s*[^,]+,\\s*(['\"`]777['\"`]|0o777|439)\\s*\\)",
    flags: "g",
    severity: "high",
    enabled: true
  },
  {
    id: "DV-006",
    name: "Obfuscated / Large Payload",
    description: "Detects extremely long base64 or hex sequences often used to hide malicious payloads.",
    pattern: "['\"`]([A-Za-z0-9+/]{200,}|[0-9a-fA-F]{400,})['\"`]",
    flags: "g",
    severity: "low",
    enabled: true
  }
];

// Ensure config folder and rules file exist
function initialize() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(RULES_FILE)) {
    fs.writeFileSync(RULES_FILE, JSON.stringify(DEFAULT_RULES, null, 2), 'utf8');
  }
}

function getRules() {
  initialize();
  try {
    const raw = fs.readFileSync(RULES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // If corruption, fallback to defaults
    return DEFAULT_RULES;
  }
}

function saveRules(rules) {
  initialize();
  fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), 'utf8');
}

function addRule(rule) {
  // Validate rule
  if (!rule.id || typeof rule.id !== 'string') {
    throw new Error('Rule ID is required and must be a string.');
  }
  if (!rule.name || typeof rule.name !== 'string') {
    throw new Error('Rule name is required.');
  }
  if (!rule.pattern || typeof rule.pattern !== 'string') {
    throw new Error('Rule regex pattern is required.');
  }
  if (!['low', 'medium', 'high', 'critical'].includes(rule.severity)) {
    throw new Error('Severity must be: low, medium, high, or critical.');
  }

  // Validate regex compiler
  try {
    new RegExp(rule.pattern, rule.flags || 'g');
  } catch (err) {
    throw new Error(`Invalid regex pattern: ${err.message}`);
  }

  const rules = getRules();
  if (rules.some(r => r.id.toLowerCase() === rule.id.toLowerCase())) {
    throw new Error(`Rule with ID "${rule.id}" already exists.`);
  }

  const newRule = {
    id: rule.id,
    name: rule.name,
    description: rule.description || '',
    pattern: rule.pattern,
    flags: rule.flags || 'g',
    severity: rule.severity,
    enabled: rule.enabled !== undefined ? !!rule.enabled : true
  };

  rules.push(newRule);
  saveRules(rules);
  return newRule;
}

function updateRule(id, updatedFields) {
  const rules = getRules();
  const index = rules.findIndex(r => r.id.toLowerCase() === id.toLowerCase());
  if (index === -index - 1 || index === -1) {
    throw new Error(`Rule with ID "${id}" not found.`);
  }

  const current = rules[index];
  const merged = { ...current, ...updatedFields };

  // Validate regex if pattern or flags updated
  if (updatedFields.pattern || updatedFields.flags) {
    try {
      new RegExp(merged.pattern, merged.flags);
    } catch (err) {
      throw new Error(`Invalid regex pattern: ${err.message}`);
    }
  }

  if (merged.severity && !['low', 'medium', 'high', 'critical'].includes(merged.severity)) {
    throw new Error('Severity must be: low, medium, high, or critical.');
  }

  rules[index] = merged;
  saveRules(rules);
  return merged;
}

function deleteRule(id) {
  const rules = getRules();
  const filtered = rules.filter(r => r.id.toLowerCase() !== id.toLowerCase());
  if (filtered.length === rules.length) {
    throw new Error(`Rule with ID "${id}" not found.`);
  }
  saveRules(filtered);
  return true;
}

function resetRules() {
  saveRules(DEFAULT_RULES);
  return DEFAULT_RULES;
}

module.exports = {
  getRules,
  addRule,
  updateRule,
  deleteRule,
  resetRules
};
