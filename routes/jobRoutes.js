const express = require('express');

const {
  createJob,
  getApprovedJobs,
  getJobById,
  getEmployerJobById,
  getMyJobs,
  getAllJobsForAdmin,
  approveJob,
  rejectJob,
  updateJob,
  deleteJob,
  updateJobStatus,
} = require('../controllers/jobController');

const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Public
router.get('/', getApprovedJobs);

// Business Owner/Admin
router.post('/', protect, allowRoles('employer', 'admin'), createJob);
router.get('/my-jobs', protect, allowRoles('employer', 'admin'), getMyJobs);

router.get(
  '/employer/:id',
  protect,
  allowRoles('employer', 'admin'),
  getEmployerJobById
);

// Admin
router.get('/admin/all', protect, allowRoles('admin'), getAllJobsForAdmin);

router.patch(
  '/admin/:id/status',
  protect,
  allowRoles('admin'),
  updateJobStatus
);

router.put('/admin/:id/approve', protect, allowRoles('admin'), approveJob);
router.put('/admin/:id/reject', protect, allowRoles('admin'), rejectJob);

// Business Owner/Admin
router.put('/:id', protect, allowRoles('employer', 'admin'), updateJob);
router.delete('/:id', protect, allowRoles('employer', 'admin'), deleteJob);

// Public single opportunity must stay last
router.get('/:id', getJobById);

module.exports = router;