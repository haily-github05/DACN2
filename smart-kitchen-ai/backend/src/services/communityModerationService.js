const db = require('../config/db');
const { classifyCommunityContent } = require('./geminiContentModerationService');
const { recordAIActivity } = require('./aiActivityService');

function communityContentType(title, content) {
  return /THÔNG TIN MÓN|DINH DƯỠNG ƯỚC TÍNH|NGUYÊN LIỆU\s*\n|CÁCH LÀM\s*\n|CÁC BƯỚC\s*\n/i.test(`${title}\n${content}`) ? 'RECIPE' : 'POST';
}

async function analyzeReview(reviewId) {
  const [rows] = await db.query(`SELECT content_type,content_title,content_text,author_user_id FROM ai_content_reviews
    WHERE review_id=? AND analysis_status IN ('PENDING_ANALYSIS','FAILED') AND decision_status='PENDING'`, [reviewId]);
  if (!rows.length) return;
  const startedAt = Date.now();
  const model = process.env.GEMINI_MODERATION_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-latest';
  try {
    const analysis = await classifyCommunityContent({ type: rows[0].content_type, title: rows[0].content_title, content: rows[0].content_text, model });
    const isSafe = analysis.flags.length === 0 && analysis.riskScore < 30;
    await db.query(`UPDATE ai_content_reviews SET ai_flags=?,highlights=?,risk_score=?,confidence=?,recommendation=?,ai_reason=?,
      analysis_status='ANALYZED',decision_status=?,analyzed_at=NOW() WHERE review_id=? AND decision_status='PENDING'`,
    [JSON.stringify(analysis.flags), JSON.stringify(analysis.highlights), analysis.riskScore, analysis.confidence, analysis.recommendation, analysis.reason, isSafe ? 'SAFE' : 'PENDING', reviewId]);
    await recordAIActivity({ type: 'CONTENT_MODERATION', status: 'SUCCESS', model: analysis.model, durationMs: Date.now() - startedAt, userId: rows[0].author_user_id });
  } catch (error) {
    const reason = error.code === 'MISSING_API_KEY' ? 'Chưa cấu hình GEMINI_API_KEY.' : 'Không thể phân tích bằng AI. Có thể thử lại.';
    await db.query(`UPDATE ai_content_reviews SET analysis_status='FAILED',ai_reason=? WHERE review_id=? AND decision_status='PENDING'`, [reason, reviewId]);
    await recordAIActivity({ type: 'CONTENT_MODERATION', status: 'FAILURE', model, durationMs: Date.now() - startedAt, errorCode: error.code || error.name || 'REQUEST_FAILED', userId: rows[0].author_user_id });
  }
}

async function queueCommunityContent({type, contentId, postId, authorId, title = '', content = '', image = ''}) {
  try {
    const [result] = await db.query(`INSERT IGNORE INTO ai_content_reviews
      (content_type,content_id,post_id,author_user_id,content_title,content_text,image_url,ai_flags,highlights,analysis_status,decision_status)
      VALUES (?,?,?,?,?,?,?,JSON_ARRAY(),JSON_ARRAY(),'PENDING_ANALYSIS','PENDING')`,
    [type, contentId, postId, authorId, String(title).slice(0, 180), String(content).slice(0, 30000), image || null]);
    if (result.insertId) setImmediate(() => void analyzeReview(result.insertId));
    return result.insertId || null;
  } catch (error) {
    console.warn('Community AI moderation queue unavailable:', error.code || error.message);
    return null;
  }
}

module.exports = { queueCommunityContent, analyzeReview, communityContentType };
