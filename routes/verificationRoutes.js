const express = require('express');

const {
  requestEmailVerification,
  confirmEmailVerification,
  requestPhoneVerification,
  confirmPhoneVerification,
} = require('../controllers/verificationController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/email/request', protect, requestEmailVerification);
router.post('/email/confirm', protect, confirmEmailVerification);

router.post('/phone/request', protect, requestPhoneVerification);
router.post('/phone/confirm', protect, confirmPhoneVerification);

module.exports = router;