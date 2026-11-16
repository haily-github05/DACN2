const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../config/db');
const { requireAdmin } = require('../services/adminService');

const router = express.Router();
router.use(requireAdmin);
const modelPath = path.resolve(__dirname, '../../model/best.pt');
const number = value => Number(value || 0);
const activityItem = row => ({
  id: String(row.ai_activity_id), userId: row.user_id == null ? null : String(row.user_id),
  userName: row.user_name || null, userEmail: row.user_email || null,
  type: row.activity_type, status: row.status, model: row.model_name,
  durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
  errorCode: row.error_code || null, time: row.created_at,
});

router.get('/ai-management', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const databaseStartedAt = Date.now();
    const daySeries = Array.from({ length: 14 }, (_, index) => 13 - index)
      .map(offset => `SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ${offset} DAY),'%Y-%m-%d') AS day`)
      .join(' UNION ALL ');
    const [[dailyRows], [logs], [todayLogs], [moderationRows], [trendRows]] = await Promise.all([
      db.query(`SELECT activity_type,COUNT(*) AS total,
        SUM(status='SUCCESS') AS successful,SUM(status='FAILURE') AS failed
        FROM ai_activity_logs WHERE created_at>=CURDATE()
        AND created_at<DATE_ADD(CURDATE(),INTERVAL 1 DAY) GROUP BY activity_type`),
      db.query(`SELECT a.ai_activity_id,a.user_id,u.full_name AS user_name,u.email AS user_email,
          a.activity_type,a.status,a.model_name,a.duration_ms,a.error_code,a.created_at
        FROM ai_activity_logs a LEFT JOIN users u ON u.user_id=a.user_id
        ORDER BY a.ai_activity_id DESC LIMIT 30`),
      db.query(`SELECT a.ai_activity_id,a.user_id,u.full_name AS user_name,u.email AS user_email,
          a.activity_type,a.status,a.model_name,a.duration_ms,a.error_code,a.created_at
        FROM ai_activity_logs a LEFT JOIN users u ON u.user_id=a.user_id
        WHERE a.created_at>=CURDATE() AND a.created_at<DATE_ADD(CURDATE(),INTERVAL 1 DAY)
        ORDER BY a.ai_activity_id DESC`),
      db.query(`SELECT SUM(moderation_status='PENDING') AS pending
        FROM community_posts WHERE visibility='PUBLIC'`),
      db.query(`SELECT days.day,COALESCE(counts.successful,0) AS successful,COALESCE(counts.failed,0) AS failed
        FROM (${daySeries}) days LEFT JOIN (
          SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS day,
            SUM(status='SUCCESS') AS successful,SUM(status='FAILURE') AS failed
          FROM ai_activity_logs
          WHERE created_at>=DATE_SUB(CURDATE(),INTERVAL 13 DAY)
            AND created_at<DATE_ADD(CURDATE(),INTERVAL 1 DAY)
          GROUP BY DATE_FORMAT(created_at,'%Y-%m-%d')
        ) counts ON counts.day=days.day ORDER BY days.day`),
    ]);
    const byType = Object.fromEntries(dailyRows.map(row => [row.activity_type, {
      total: number(row.total), successful: number(row.successful), failed: number(row.failed),
    }]));
    const databaseLatencyMs = Date.now() - databaseStartedAt;
    const hasVisionModel = fs.existsSync(modelPath);
    let visionOnline = false;
    const healthUrl = `${(process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')}/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    try {
      const response = await fetch(healthUrl, { signal: controller.signal });
      if (response.ok) visionOnline = (await response.json())?.success === true;
    } catch { visionOnline = false; }
    finally { clearTimeout(timeout); }

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    const latest = (...types) => logs.find(row => types.includes(row.activity_type));
    const scanLast = latest('INGREDIENT_SCAN');
    const planLast = latest('MEAL_PLAN', 'RECIPE_SUGGESTION');
    const chatLast = latest('CHAT');
    const geminiStatus = type => {
      const last = latest(type);
      if (!hasGeminiKey) return { online: false, status: 'Thiếu GEMINI_API_KEY' };
      if (!last) return { online: null, status: 'Đã cấu hình · chưa có lần gọi' };
      if (last.status === 'FAILURE') return { online: false, status: `Lỗi lần gọi gần nhất${last.error_code ? ` · ${last.error_code}` : ''}` };
      return { online: true, status: 'Hoạt động gần đây' };
    };
    const plannerState = geminiStatus('MEAL_PLAN');
    const assistantState = geminiStatus('CHAT');
    const models = [
      {
        key: 'vision', name: 'KitchenVision', version: 'YOLO · best.pt',
        provider: 'Vision AI', configured: hasVisionModel, online: visionOnline,
        architecture: 'Ultralytics YOLO · Computer Vision', latencyMs: scanLast?.duration_ms == null ? null : Number(scanLast.duration_ms),
        configHint: 'Model: backend/model/best.pt · URL: AI_SERVICE_URL (mặc định cổng 8000)',
        status: visionOnline ? 'Đang hoạt động' : hasVisionModel ? 'Đã có model · dịch vụ chưa chạy' : 'Chưa có model',
        detail: hasVisionModel ? 'Model file: backend/model/best.pt' : 'Đặt model tại backend/model/best.pt',
      },
      {
        key: 'meal-plan', name: 'Gemini Meal Planner',
        version: process.env.GEMINI_MEAL_PLAN_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-latest',
        provider: 'Gemini API', configured: hasGeminiKey, ...plannerState,
        architecture: 'Google Gemini · Generative Model', latencyMs: planLast?.duration_ms == null ? null : Number(planLast.duration_ms),
        configHint: 'API key: GEMINI_API_KEY · Model: GEMINI_MEAL_PLAN_MODEL hoặc GEMINI_MODEL',
        detail: 'Gợi ý món ăn và lập thực đơn theo khẩu vị, nguyên liệu trong kho',
      },
      {
        key: 'assistant', name: 'Trợ lý Smart Kitchen',
        version: process.env.GEMINI_MODEL || 'gemini-flash-latest',
        provider: 'Gemini API', configured: hasGeminiKey, ...assistantState,
        architecture: 'Google Gemini · Generative Model', latencyMs: chatLast?.duration_ms == null ? null : Number(chatLast.duration_ms),
        configHint: 'API key: GEMINI_API_KEY · Model: GEMINI_MODEL',
        detail: 'Chat hỗ trợ nấu ăn và quản lý kho thực phẩm',
      },
      {
        key: 'database', name: 'MySQL Database', version: 'Database ứng dụng',
        provider: 'MySQL', configured: true, online: true, status: 'Đang kết nối',
        architecture: 'MySQL · Relational Database', latencyMs: databaseLatencyMs,
        configHint: 'Kết nối: DB_HOST · DB_PORT · DB_NAME trong backend/.env',
        detail: 'Lưu nhật ký AI, nội dung cộng đồng và số liệu kiểm duyệt',
      },
    ];
    const daily = type => byType[type] || { total: 0, successful: 0, failed: 0 };
    res.json({ success: true, data: {
      models,
      daily: {
        scans: daily('INGREDIENT_SCAN'),
        suggestions: daily('RECIPE_SUGGESTION'),
        mealPlans: daily('MEAL_PLAN'),
        chats: daily('CHAT'),
        failures: Object.values(byType).reduce((sum, group) => sum + group.failed, 0),
      },
      dailyTrend: trendRows.map(row => ({
        day: row.day,
        successful: number(row.successful),
        failed: number(row.failed),
        total: number(row.successful) + number(row.failed),
      })),
      moderation: { pending: number(moderationRows[0].pending), reportsTracked: false },
      activity: logs.map(activityItem),
      todayActivity: todayLogs.map(activityItem),
    }});
  } catch (error) {
    console.error('Admin AI management:', error.message);
    res.status(503).json({ success: false, message: 'Không thể tải nhật ký hoạt động AI từ database.' });
  }
});

module.exports = router;
