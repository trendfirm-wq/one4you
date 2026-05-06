const express = require('express');
const { uploadResume } = require('../config/cloudinary');

const {
  registerUser,
  loginUser,
  getMe,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

router.post(
  '/me/resume',
  protect,
  uploadResume.single('resume'),
  uploadMyResume
);

module.exports = router;