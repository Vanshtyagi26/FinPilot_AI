const express = require('express');
const { latest, refresh } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/latest', latest);
router.post('/refresh', refresh);

module.exports = router;
