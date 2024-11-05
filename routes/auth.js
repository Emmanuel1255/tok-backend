// routes/auth.js
const express = require('express');
const { check } = require('express-validator');
const { validateUpdateDetails } = require('../middleware/validation');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  updateInterests
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');  // Import specifically uploadAvatar

const router = express.Router();

router.post(
  '/register',
  [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  register
);

router.post('/login', login);
router.use(protect);
router.get('/me', getMe);

// Use uploadAvatar middleware
router.put(
  '/updatedetails', 
  protect, 
  uploadAvatar,  // Use the specific avatar upload middleware
  validateUpdateDetails, 
  updateDetails
);

router.put('/updatepassword', protect, updatePassword);
router.put('/updateinterests', protect, updateInterests);

module.exports = router;