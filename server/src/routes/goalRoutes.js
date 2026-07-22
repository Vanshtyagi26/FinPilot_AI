const express = require('express');
const { list, getOne, create, update, remove } = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.route('/').get(list).post(create);
router.route('/:id').get(getOne).put(update).delete(remove);

module.exports = router;
