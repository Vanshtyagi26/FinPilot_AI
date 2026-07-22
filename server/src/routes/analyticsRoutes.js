const express = require('express');
const { getDashboard } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/dashboard', getDashboard);

module.exports = router;
