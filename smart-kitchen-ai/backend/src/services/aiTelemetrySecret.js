const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const secretPath = path.resolve(__dirname, '../../.ai-telemetry-secret');

function getAITelemetrySecret() {
  try { return fs.readFileSync(secretPath, 'utf8').trim(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const secret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(secretPath, secret, { flag: 'wx', mode: 0o600 });
    return secret;
  } catch (error) {
    if (error.code === 'EEXIST') return fs.readFileSync(secretPath, 'utf8').trim();
    throw error;
  }
}

module.exports = { getAITelemetrySecret };
