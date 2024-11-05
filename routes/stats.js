// routes/stats.js
const express = require('express');
const { getStats, updateCountriesReached } = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getStats);
router.put('/countries', protect, authorize('admin'), updateCountriesReached);

module.exports = router;