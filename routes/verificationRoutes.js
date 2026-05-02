const express = require('express');

const {
  requestEmailVerification,
  confirmEmailVerification,
} = require('../controllers/verificationController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/email/request', protect, requestEmailVerification);
router.post('/email/confirm', protect, confirmEmailVerification);

module.exports = router;