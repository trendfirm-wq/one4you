const express = require('express');

const {
  getMyJobAlerts,
  createJobAlert,
  updateJobAlert,
  deleteJobAlert,
} = require('../controllers/jobAlertController');

const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/my', protect, allowRoles('job_seeker', 'admin'), getMyJobAlerts);
router.post('/', protect, allowRoles('job_seeker', 'admin'), createJobAlert);
router.put('/:id', protect, allowRoles('job_seeker', 'admin'), updateJobAlert);
router.delete('/:id', protect, allowRoles('job_seeker', 'admin'), deleteJobAlert);

module.exports = router;