const express = require('express');

const {
  saveJob,
  getMySavedJobs,
  removeSavedJob,
} = require('../controllers/savedJobController');

const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// User saves an opportunity
router.post('/:jobId', protect, allowRoles('job_seeker', 'admin'), saveJob);

// User views saved opportunities
router.get('/my', protect, allowRoles('job_seeker', 'admin'), getMySavedJobs);

// User removes a saved opportunity
router.delete(
  '/:jobId',
  protect,
  allowRoles('job_seeker', 'admin'),
  removeSavedJob
);

module.exports = router;