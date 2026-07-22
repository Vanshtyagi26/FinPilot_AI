const express = require('express');
const { list, refresh, markRead } = require('../controllers/insightController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', list);
router.post('/refresh', refresh);
router.patch('/:id/read', markRead);

module.exports = router;
