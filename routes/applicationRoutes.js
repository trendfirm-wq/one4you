const express = require('express');

const {
  applyForJob,
  getMyApplications,
  getEmployerApplications,
  getAllApplicationsForAdmin,
  updateApplicationStatus,
} = require('../controllers/applicationController');

const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// User responds/applies to an opportunity
router.post(
  '/:jobId/apply',
  protect,
  allowRoles('job_seeker', 'admin'),
  applyForJob
);

// User views own responses/applications
router.get(
  '/my-applications',
  protect,
  allowRoles('job_seeker', 'admin'),
  getMyApplications
);

// Business owner views responses/applications for their opportunities
router.get(
  '/employer',
  protect,
  allowRoles('employer', 'admin'),
  getEmployerApplications
);

// Admin views all responses/applications
router.get(
  '/admin/all',
  protect,
  allowRoles('admin'),
  getAllApplicationsForAdmin
);

// Business owner/admin updates response status
router.put(
  '/:id/status',
  protect,
  allowRoles('employer', 'admin'),
  updateApplicationStatus
);

module.exports = router;