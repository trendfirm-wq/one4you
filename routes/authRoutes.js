const express = require('express');

const {
  register,
  login,
  getMe,
  uploadMyResume,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const { uploadResume } = require('../config/cloudinary');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

router.post(
  '/me/resume',
  protect,
  uploadResume.single('resume'),
  uploadMyResume
);

module.exports = router;