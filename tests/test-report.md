# DevVirus Scan Report

- **Scan Target:** `C:\Users\Nitin\Desktop\DevVirus\tests\mock_project`
- **Date:** 21/6/2026, 9:49:45 am
- **Scanned Files:** 7
- **Total Issues:** 9

### System Context

- **OS:** Windows_NT
- **Platform:** win32
- **Architecture:** x64
- **Node Version:** v24.14.0
- **Hostname:** DESKTOP-95T1DEA
- **Home Directory:** `C:\Users\Nitin`

### Project Statistics

- **Total Files:** 8
- **Total Folders:** 2
- **Largest File:** `payload.js` (0.3 KB)
- **Extension Stats:**
  - `no-extension`: 1
  - `.js`: 7

## Severity Summary

| Severity | Count |
| :--- | :--- |
| 🛑 **Critical** | 2 |
| 🟠 **High** | 2 |
| 🟡 **Medium** | 4 |
| 🔵 **Low** | 1 |

## Findings Details

| File | Line | Rule | Severity | Matched Code |
| :--- | :--- | :--- | :--- | :--- |
| `crypto_weak.js` | 3 | **DV-004** (Weak Cryptography) | 🟡 MEDIUM | `const md5Hash = crypto.createHash(&#039;md5&#039;).update(&#039;data&#039;).digest(&#039;hex&#039;);` |
| `crypto_weak.js` | 4 | **DV-004** (Weak Cryptography) | 🟡 MEDIUM | `const sha1Hash = crypto.createHash(&#039;sha1&#039;).update(&#039;data&#039;).digest(&#039;hex&#039;);` |
| `danger_eval.js` | 3 | **DV-002** (Dangerous Code Execution) | 🛑 CRITICAL | `return eval(&quot;(&quot; + data + &quot;)&quot;);` |
| `danger_eval.js` | 5 | **DV-002** (Dangerous Code Execution) | 🛑 CRITICAL | `const creator = new Function(&#039;a&#039;, &#039;b&#039;, &#039;return a + b&#039;);` |
| `exec_cmd.js` | 3 | **DV-003** (Insecure Command Execution) | 🟡 MEDIUM | `cp.exec(&#039;ping &#039; + host, (err, out) =&gt; {` |
| `exec_cmd.js` | 6 | **DV-003** (Insecure Command Execution) | 🟡 MEDIUM | `const val = cp.execSync(&#039;whoami&#039;);` |
| `payload.js` | 2 | **DV-006** (Obfuscated / Large Payload) | 🔵 LOW | `const secretPayload = &quot;dGhpcyBpcyBhIHZlcnkgbG9uZyBiYXNlNjQgc3RyaW5nIHRoYXQgc2hvd...` |
| `permissions.js` | 3 | **DV-005** (Insecure File Permissions) | 🟠 HIGH | `fs.chmodSync(&#039;config.json&#039;, &#039;777&#039;);` |
| `secrets.js` | 2 | **DV-001** (Hardcoded API Secret) | 🟠 HIGH | `const api_key = &quot;AIzaSyD-xyz1234567890abcdefghij&quot;;` |
