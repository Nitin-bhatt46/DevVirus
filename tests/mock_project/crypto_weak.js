// Weak hash algorithms
const crypto = require('crypto');
const md5Hash = crypto.createHash('md5').update('data').digest('hex');
const sha1Hash = crypto.createHash('sha1').update('data').digest('hex');
