const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getRecommendations } = require('../controllers/investmentController');

const router = express.Router();

router.use(protect);
router.post('/recommendations', getRecommendations);
router.get('/recommendations', getRecommendations);

module.exports = router;
