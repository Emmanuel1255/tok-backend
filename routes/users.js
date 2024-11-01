// routes/users.js
const express = require('express');
const { cacheStats } = require('../middleware/statsCache');
const {
  getUsers,
  getUser,
  updateUser,
  updateProfile,
  deleteUser,
  getUserProfile,
  saveInterests,
  getUserStats 
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { 
  getUserActivities, 
  clearActivities 
} = require('../controllers/activityController');

const router = express.Router();

// Public routes
router.get('/profile/:username', getUserProfile);

// Protected routes
router.use(protect);
// router.get('/stats', protect, getUserStats);
router.get('/stats', protect, cacheStats, getUserStats);
router.get('/activities', protect, getUserActivities);
router.delete('/activities', protect, clearActivities);
router.put('/profile/update', protect, updateProfile);
router.get('/', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), getUser);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);
router.post('/interests', saveInterests);


module.exports = router;
