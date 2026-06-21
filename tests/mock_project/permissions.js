// Weak file permission check
const fs = require('fs');
fs.chmodSync('config.json', '777');
fs.chmod('data.txt', 0o777, () => {});
