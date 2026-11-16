const db = require('../config/db');

async function recordAIActivity({ type, status, model, durationMs, errorCode, userId }) {
  try {
    if (!['INGREDIENT_SCAN', 'RECIPE_SUGGESTION', 'MEAL_PLAN', 'CHAT', 'CONTENT_MODERATION'].includes(type)) return;
    if (!['SUCCESS', 'FAILURE'].includes(status)) return;
    await db.query(
      `INSERT INTO ai_activity_logs (user_id,activity_type,status,model_name,duration_ms,error_code)
       VALUES (?,?,?,?,?,?)`,
      [Number.isSafeInteger(Number(userId)) && Number(userId) > 0 ? Number(userId) : null, type, status, String(model || 'unknown').slice(0, 120), Number.isFinite(durationMs) ? Math.max(0, Math.min(4294967295, Math.round(durationMs))) : null, errorCode ? String(errorCode).slice(0, 80) : null],
    );
  } catch (error) {
    // Ghi nhận telemetry không được làm gián đoạn yêu cầu AI của người dùng.
    console.warn('AI activity log unavailable:', error.code || error.message);
  }
}

module.exports = { recordAIActivity };
