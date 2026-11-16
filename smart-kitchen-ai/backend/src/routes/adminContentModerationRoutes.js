const express = require('express');
const db = require('../config/db');
const { requireAdmin } = require('../services/adminService');
const { queueCommunityContent, communityContentType, analyzeReview } = require('../services/communityModerationService');

const router = express.Router();
router.use(requireAdmin);
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const validId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const flags = ['INAPPROPRIATE', 'SPAM', 'OFF_TOPIC', 'FOOD_SAFETY', 'MISINFORMATION'];
const route = fn => async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { await fn(req, res); }
  catch (error) {
    console.error('AI moderation:', error.message);
    res.status(error.status || 503).json({ success: false, message: error.status ? error.message : 'Không thể xử lý hàng đợi kiểm duyệt AI.' });
  }
};
const mapRow = row => {
  let aiFlags = row.ai_flags;
  if (typeof aiFlags === 'string') { try { aiFlags = JSON.parse(aiFlags); } catch { aiFlags = []; } }
  let highlights = row.highlights;
  if (typeof highlights === 'string') { try { highlights = JSON.parse(highlights); } catch { highlights = []; } }
  const ageMonths = Math.floor(Number(row.account_age_days || 0) / 30);
  const approvedPosts = Number(row.approved_posts || 0);
  const violations = Number(row.prior_violations || 0);
  const trustScore = Math.max(0, Math.min(100, 50 + Math.min(20, ageMonths) + Math.min(20, approvedPosts * 2) - Math.min(60, violations * 15)));
  return {
    id: String(row.review_id), contentId: String(row.content_id), postId: String(row.post_id),
    type: row.content_type, title: row.content_title || '', content: row.content_text || '', image: row.image_url || '',
    author: row.author, authorId: String(row.author_user_id), trustScore,
    flags: Array.isArray(aiFlags) ? aiFlags : [], highlights: Array.isArray(highlights) ? highlights : [], riskScore: row.risk_score == null ? null : Number(row.risk_score),
    confidence: row.confidence == null ? null : Number(row.confidence), recommendation: row.recommendation,
    reason: row.ai_reason || '', analysisStatus: row.analysis_status, status: row.decision_status,
    createdAt: row.content_created_at || row.created_at, analyzedAt: row.analyzed_at,
  };
};

router.get('/ai-moderation', route(async (req, res) => {
  const type = req.query.type || 'ALL';
  const flag = req.query.flag || 'ALL';
  const risk = req.query.risk || 'ALL';
  const status = req.query.status || 'PENDING';
  const days = req.query.days || 'ALL';
  const sort = req.query.sort || 'RISK_DESC';
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!['ALL', 'POST', 'COMMENT', 'RECIPE'].includes(type) || !['ALL', ...flags].includes(flag) || !['ALL', 'LOW', 'MEDIUM', 'HIGH'].includes(risk) || !['ALL', 'PENDING', 'ANALYSIS_PENDING', 'FAILED', 'SAFE', 'APPROVED', 'HIDDEN', 'DISMISSED', 'REMOVED'].includes(status) || !['ALL', '1', '7', '30', '90'].includes(String(days)) || !['RISK_DESC', 'NEWEST'].includes(sort) || !Number.isSafeInteger(page) || page < 1 || page > 10000 || query.length > 150) throw fail('Bộ lọc kiểm duyệt AI không hợp lệ.');

  const conditions = ['1=1'], values = [];
  if (type !== 'ALL') { conditions.push('r.content_type=?'); values.push(type); }
  if (flag !== 'ALL') { conditions.push('JSON_CONTAINS(r.ai_flags,JSON_QUOTE(?))'); values.push(flag); }
  if (risk === 'LOW') conditions.push('r.risk_score<30');
  if (risk === 'MEDIUM') conditions.push('r.risk_score BETWEEN 30 AND 69');
  if (risk === 'HIGH') conditions.push('r.risk_score>=70');
  if (status === 'PENDING') conditions.push("r.decision_status='PENDING' AND r.analysis_status='ANALYZED' AND (r.risk_score>=30 OR JSON_LENGTH(r.ai_flags)>0)");
  else if (status === 'ANALYSIS_PENDING') conditions.push("r.analysis_status='PENDING_ANALYSIS'");
  else if (status === 'FAILED') conditions.push("r.analysis_status='FAILED'");
  else if (status === 'SAFE') conditions.push("r.analysis_status='ANALYZED' AND r.decision_status='SAFE'");
  else if (status !== 'ALL') { conditions.push('r.decision_status=?'); values.push(status); }
  if (days !== 'ALL') { conditions.push('r.created_at>=DATE_SUB(CURDATE(),INTERVAL ? DAY) AND r.created_at<DATE_ADD(CURDATE(),INTERVAL 1 DAY)'); values.push(Number(days) - 1); }
  if (query) {
    for (const token of query.replace(/[đĐ]/g, 'd').split(/\s+/)) {
      conditions.push("REPLACE(REPLACE(CONVERT(CONCAT_WS(' ',r.content_title,r.content_text,u.full_name,CAST(r.content_id AS CHAR)) USING utf8mb4),'đ','d'),'Đ','D') COLLATE utf8mb4_unicode_ci LIKE ? ESCAPE '!'");
      values.push(`%${token.replace(/[!%_]/g, char => `!${char}`)}%`);
    }
  }
  const where = conditions.join(' AND ');
  const order = sort === 'RISK_DESC' ? 'r.risk_score IS NULL ASC,r.risk_score DESC,r.created_at DESC' : 'r.created_at DESC,r.review_id DESC';
  const fields = `r.*,u.full_name AS author,u.created_at AS user_created_at,
    COALESCE(p.created_at,c.created_at,r.created_at) AS content_created_at,
    (SELECT COUNT(*) FROM community_posts authored WHERE authored.user_id=u.user_id AND authored.moderation_status='APPROVED') AS approved_posts,
    (SELECT COUNT(*) FROM ai_content_reviews prior WHERE prior.author_user_id=u.user_id AND prior.decision_status IN ('HIDDEN','REMOVED')) AS prior_violations,
    TIMESTAMPDIFF(DAY,u.created_at,NOW()) AS account_age_days`;
  const [[rows], [count], [stats]] = await Promise.all([
    db.query(`SELECT ${fields} FROM ai_content_reviews r JOIN users u ON u.user_id=r.author_user_id LEFT JOIN community_posts p ON p.post_id=r.post_id LEFT JOIN community_comments c ON r.content_type='COMMENT' AND c.comment_id=r.content_id WHERE ${where} ORDER BY ${order} LIMIT 11 OFFSET ?`, [...values, (page - 1) * 10]),
    db.query(`SELECT COUNT(*) AS total FROM ai_content_reviews r JOIN users u ON u.user_id=r.author_user_id WHERE ${where}`, values),
    db.query(`SELECT
      COALESCE(SUM(analysis_status='ANALYZED'),0) AS analyzed,
      COALESCE(SUM(analysis_status='ANALYZED' AND decision_status='PENDING' AND (risk_score>=30 OR JSON_LENGTH(ai_flags)>0)),0) AS pending,
      COALESCE(SUM(analysis_status='ANALYZED' AND risk_score>=70),0) AS high_risk,
      COALESCE(SUM(analysis_status='ANALYZED' AND decision_status IN ('APPROVED','HIDDEN','DISMISSED','REMOVED')),0) AS processed
      FROM ai_content_reviews`),
  ]);
  res.json({ success: true, data: {
    items: rows.slice(0, 10).map(mapRow), hasMore: rows.length > 10, total: Number(count[0].total),
    stats: Object.fromEntries(Object.entries(stats[0]).map(([key, value]) => [key, Number(value || 0)])),
  }});
}));

router.post('/ai-moderation/scan', route(async (req, res) => {
  const [[posts], [comments]] = await Promise.all([
    db.query(`SELECT p.post_id,p.user_id,p.title,p.description,p.image_url,p.category FROM community_posts p
      WHERE p.visibility='PUBLIC'
      AND NOT EXISTS (SELECT 1 FROM ai_content_reviews r WHERE r.content_id=p.post_id AND r.content_type IN ('POST','RECIPE'))
      ORDER BY p.created_at DESC LIMIT 30`),
    db.query(`SELECT c.comment_id,c.post_id,c.user_id,c.content,p.title AS post_title,p.image_url,p.visibility,p.moderation_status AS post_status
      FROM community_comments c JOIN community_posts p ON p.post_id=c.post_id
      WHERE c.moderation_status='APPROVED' AND p.visibility='PUBLIC' AND p.moderation_status='APPROVED'
      AND NOT EXISTS (SELECT 1 FROM ai_content_reviews r WHERE r.content_type='COMMENT' AND r.content_id=c.comment_id)
      ORDER BY c.created_at DESC LIMIT 30`),
  ]);
  let queued = 0;
  for (const post of posts) {
    const id = await queueCommunityContent({ type: communityContentType(post.title, post.description), contentId: post.post_id, postId: post.post_id, authorId: post.user_id, title: post.title, content: post.description, image: post.image_url || '' });
    if (id) queued++;
  }
  for (const comment of comments) {
    const id = await queueCommunityContent({ type: 'COMMENT', contentId: comment.comment_id, postId: comment.post_id, authorId: comment.user_id, title: `Bình luận về: ${comment.post_title}`, content: comment.content, image: comment.image_url || '' });
    if (id) queued++;
  }
  res.json({ success: true, data: { queued } });
}));

router.post('/ai-moderation/:reviewId/retry', route(async (req, res) => {
  const reviewId = validId(req.params.reviewId);
  if (!reviewId) throw fail('ID kiểm duyệt không hợp lệ.');
  const [rows] = await db.query("SELECT review_id FROM ai_content_reviews WHERE review_id=? AND decision_status='PENDING' AND analysis_status='FAILED'", [reviewId]);
  if (!rows.length) throw fail('Mục này không còn cần phân tích lại.', 409);
  await db.query("UPDATE ai_content_reviews SET analysis_status='PENDING_ANALYSIS' WHERE review_id=?", [reviewId]);
  setImmediate(() => void analyzeReview(reviewId));
  res.json({ success: true, data: null });
}));

router.patch('/ai-moderation/:reviewId/decision', route(async (req, res) => {
  const reviewId = validId(req.params.reviewId);
  const action = req.body?.action;
  if (!reviewId || !['APPROVE', 'HIDE', 'DISMISS', 'DELETE_AND_PUNISH'].includes(action)) throw fail('Thao tác kiểm duyệt không hợp lệ.');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [reviews] = await conn.query('SELECT * FROM ai_content_reviews WHERE review_id=? FOR UPDATE', [reviewId]);
    if (!reviews.length) throw fail('Không tìm thấy mục kiểm duyệt.', 404);
    const review = reviews[0];
    if (review.decision_status !== 'PENDING') throw fail('Mục này đã được xử lý. Hãy tải lại hàng đợi.', 409);

    let decisionStatus = action === 'APPROVE' ? 'APPROVED' : action === 'DISMISS' ? 'DISMISSED' : action === 'DELETE_AND_PUNISH' ? 'REMOVED' : 'HIDDEN';
    if (review.content_type === 'COMMENT') {
      const [contents] = await conn.query('SELECT comment_id FROM community_comments WHERE comment_id=? AND post_id=? FOR UPDATE', [review.content_id, review.post_id]);
      if (!contents.length) throw fail('Bình luận đã bị xóa.', 409);
      if (action === 'APPROVE') await conn.query("UPDATE community_comments SET moderation_status='APPROVED' WHERE comment_id=?", [review.content_id]);
      if (action === 'HIDE') await conn.query("UPDATE community_comments SET moderation_status='HIDDEN' WHERE comment_id=?", [review.content_id]);
      if (action === 'DELETE_AND_PUNISH') await conn.query('DELETE FROM community_comments WHERE comment_id=?', [review.content_id]);
    } else {
      const [contents] = await conn.query("SELECT post_id FROM community_posts WHERE post_id=? AND visibility='PUBLIC' FOR UPDATE", [review.post_id]);
      if (!contents.length) throw fail('Bài viết đã bị xóa hoặc không còn công khai.', 409);
      if (action === 'APPROVE' || action === 'DISMISS') await conn.query("UPDATE community_posts SET moderation_status='APPROVED',reviewed_by=?,reviewed_at=NOW(),rejection_reason=NULL WHERE post_id=?", [req.admin.id, review.post_id]);
      if (action === 'HIDE') await conn.query("UPDATE community_posts SET moderation_status='HIDDEN',reviewed_by=?,reviewed_at=NOW() WHERE post_id=?", [req.admin.id, review.post_id]);
      if (action === 'DELETE_AND_PUNISH') await conn.query('DELETE FROM community_posts WHERE post_id=?', [review.post_id]);
    }
    if (action === 'DELETE_AND_PUNISH') {
      const [authors] = await conn.query('SELECT role FROM users WHERE user_id=? FOR UPDATE', [review.author_user_id]);
      if (!authors.length || authors[0].role === 'ADMIN') throw fail('Không thể phạt tài khoản quản trị viên.', 409);
      const reason = `Tài khoản bị khóa sau quyết định kiểm duyệt AI #${reviewId} bởi quản trị viên.`;
      await conn.query('UPDATE users SET is_active=0,locked_reason=? WHERE user_id=?', [reason, review.author_user_id]);
    }
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 1000) : null;
    await conn.query('UPDATE ai_content_reviews SET decision_status=?,decision_note=?,reviewed_by=?,reviewed_at=NOW() WHERE review_id=?', [decisionStatus, note, req.admin.id, reviewId]);
    await conn.commit();
    res.json({ success: true, data: { id: String(reviewId), status: decisionStatus } });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}));

module.exports = router;
