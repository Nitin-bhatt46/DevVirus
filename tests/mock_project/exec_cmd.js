// Insecure execution
const cp = require('child_process');
cp.exec('ping ' + host, (err, out) => {
  console.log(out);
});
const val = cp.execSync('whoami');
