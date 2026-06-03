const express = require('express');
const multer = require('multer');

const {
  applyForJob,
  getMyApplications,
  getEmployerApplications,
  getAllApplicationsForAdmin,
  updateApplicationStatus,
  downloadApplicationResume,
} = require('../controllers/applicationController');

const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.memoryStorage();

const uploadApplicationPdf = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }

    cb(null, true);
  },
});

// User responds/applies to an opportunity
router.post(
  '/:jobId/apply',
  protect,
  allowRoles('job_seeker', 'admin'),
  uploadApplicationPdf.single('applicationPdf'),
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
router.get('/:id/resume', downloadApplicationResume);
module.exports = router;