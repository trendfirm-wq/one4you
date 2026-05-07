const express = require('express');

const {
  registerUser,
  loginUser,
  getMe,
  uploadMyResume,
  getMyResumes,
  setDefaultResume,
  deleteResume,
  uploadMyLogo,
} = require('../controllers/authController');

 

const { protect } = require('../middleware/authMiddleware');
const { uploadResume } = require('../config/cloudinary');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

router.get('/me/resumes', protect, getMyResumes);

router.post(
  '/me/resume',
  protect,
  uploadResume.single('resume'),
  uploadMyResume
);
router.post(
  '/me/logo',
  protect,
  uploadLogo.single('logo'),
  uploadMyLogo
);
router.put('/me/resumes/:id/default', protect, setDefaultResume);
router.delete('/me/resumes/:id', protect, deleteResume);

module.exports = router;