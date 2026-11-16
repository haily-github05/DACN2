const crypto = require('node:crypto');
const express = require('express');
const { recordAIActivity } = require('../services/aiActivityService');
const { getAITelemetrySecret } = require('../services/aiTelemetrySecret');
const { tokenUser } = require('../services/sessionService');

const router = express.Router();
router.post('/telemetry', async (req, res) => {
  const configuredSecret = getAITelemetrySecret();
  const providedSecret = String(req.get('x-ai-telemetry-secret') || '');
  const expected = Buffer.from(configuredSecret);
  const received = Buffer.from(providedSecret);
  if (!configuredSecret || expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return res.status(401).json({ success: false, message: 'Không được phép ghi telemetry AI.' });
  }
  const { status, model, durationMs, errorCode } = req.body || {};
  if (!['SUCCESS', 'FAILURE'].includes(status) || typeof model !== 'string' || !Number.isSafeInteger(durationMs) || durationMs < 0 || (errorCode != null && typeof errorCode !== 'string')) {
    return res.status(400).json({ success: false, message: 'Dữ liệu telemetry không hợp lệ.' });
  }
  await recordAIActivity({ type: 'INGREDIENT_SCAN', status, model, durationMs, errorCode, userId: tokenUser(req) });
  res.json({ success: true, data: null });
});

module.exports = router;
