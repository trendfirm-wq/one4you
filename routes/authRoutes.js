const express = require('express');

const {
  registerUser,
  loginUser,
  getMe,
  uploadMyResume,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const { uploadResume } = require('../config/cloudinary');

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