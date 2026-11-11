const express = require('express');
const { requireAdmin } = require('../services/adminService');
const { getOverview } = require('../services/adminOverviewService');
const router = express.Router();
router.use(requireAdmin);
router.get('/session', (req, res) => res.json({ success: true, data: req.admin }));
router.get('/overview', async (req, res) => {
  const days = req.query.days === undefined ? 7 : Number(req.query.days);
  if (![7, 30, 90].includes(days)) return res.status(400).json({ success: false, message: 'Chỉ hỗ trợ khoảng thời gian 7, 30 hoặc 90 ngày.' });
  res.set('Cache-Control', 'no-store');
  try { res.json({ success: true, data: await getOverview(days) }); }
  catch (error) {
    console.error('Admin overview:', error.message);
    res.status(503).json({ success: false, message: 'Không thể tải dữ liệu Tổng quan từ MySQL. Vui lòng thử lại.' });
  }
});
router.get('/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().replace(/\s+/g, ' ') : '';
  const type = req.query.type === undefined ? 'all' : req.query.type;
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (query.length > 100 || !['all','recipes','ingredients','users'].includes(type) || !Number.isSafeInteger(page) || page < 1 || page > 1000) {
    return res.status(400).json({ success:false, message:'Từ khoá tối đa 100 ký tự; loại và trang tìm kiếm phải hợp lệ.' });
  }
  res.set('Cache-Control','no-store');
  if (!query) return res.json({success:true,data:{query:'',page,groups:{}}});
  try { res.json({success:true,data:await require('../services/adminSearchService').searchAdmin(query,type,page)}); }
  catch(error) { console.error('Admin search:',error.message);res.status(503).json({success:false,message:'Không thể tìm kiếm trong MySQL. Vui lòng thử lại.'}); }
});
module.exports = router;
