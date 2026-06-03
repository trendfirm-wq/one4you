const Application = require('../models/Application');
const Job = require('../models/Job');
const cloudinary = require('../config/cloudinary');

const APPLICANT_PUBLIC_FIELDS = 'name email phone emailVerified phoneVerified';

const JOB_PUBLIC_FIELDS =
  'title companyName location jobType category salary status applicationMethod applicationEmail applicationLink whatsappNumber phoneNumber';

const uploadPdfToCloudinary = async (file) => {
  if (!file) {
    return {
      url: '',
      publicId: '',
    };
  }

  const base64File = `data:${file.mimetype};base64,${file.buffer.toString(
    'base64'
  )}`;

const uploadResult = await cloudinary.uploader.upload(base64File, {
  folder: 'one4you/applications',
  resource_type: 'raw',
  format: 'pdf',
  access_mode: 'public',
});
  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
  };
};

// @desc    User responds/applies to an opportunity
// @route   POST /api/applications/:jobId/apply
// @access  Job Seeker
const applyForJob = async (req, res) => {
  try {
    const { fullName, email, phone, message, coverLetter, resumeLink } =
      req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        message: 'Full name and email are required',
      });
    }

    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        message: 'Opportunity not found',
      });
    }

    if (job.status !== 'approved' || !job.isActive) {
      return res.status(400).json({
        message: 'You can only respond to approved active opportunities',
      });
    }

 if (job.applicationMethod !== 'platform') {
  return res.status(400).json({
    message: 'This opportunity is not accepting applications through One4You',
  });
}
    const existingApplication = await Application.findOne({
      job: job._id,
      applicant: req.user._id,
    });

    if (existingApplication) {
      return res.status(400).json({
        message: 'You have already responded to this opportunity',
      });
    }

    const user = req.user;

    let applicationPdfUrl = user.resumeUrl || '';
    let applicationPdfPublicId = user.resumePublicId || '';
    let resumeOriginalName = user.resumeOriginalName || '';

    if (req.file) {
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({
          message: 'Please upload one PDF document only',
        });
      }

      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          message: 'PDF must be less than 5MB',
        });
      }

      const uploadedPdf = await uploadPdfToCloudinary(req.file);

      applicationPdfUrl = uploadedPdf.url;
      applicationPdfPublicId = uploadedPdf.publicId;
      resumeOriginalName = req.file.originalname;

      user.resumeUrl = uploadedPdf.url;
      user.resumePublicId = uploadedPdf.publicId;
      user.resumeOriginalName = req.file.originalname;

      await user.save();
    }

    if (!applicationPdfUrl && !resumeLink) {
      return res.status(400).json({
        message: 'Please upload your resume before applying for this job.',
      });
    }

const application = await Application.create({
  job: job._id,
  applicant: user._id,

  fullName,
  email,
  phone: phone || '',

  message: message || '',
  coverLetter: coverLetter || '',

  resumeUrl: applicationPdfUrl,
  resumeOriginalName,

  resumeLink: resumeLink || '',

  applicationPdfUrl,
  applicationPdfPublicId,

  status: 'submitted',
});

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to submit application',
      error: error.message,
    });
  }
};

// @desc    User views own responses/applications
// @route   GET /api/applications/my-applications
// @access  Job Seeker
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({
      applicant: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate('job', JOB_PUBLIC_FIELDS);

    res.json(applications);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch your responses',
      error: error.message,
    });
  }
};

// @desc    Business owner views responses for opportunities they own
// @route   GET /api/applications/employer
// @access  Employer/Admin
const getEmployerApplications = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role !== 'admin') {
      const employerJobs = await Job.find({ employer: req.user._id }).select(
        '_id'
      );

      const jobIds = employerJobs.map((job) => job._id);

      filter = {
        job: { $in: jobIds },
      };
    }

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate('job', 'title companyName location jobType category')
      .populate('applicant', APPLICANT_PUBLIC_FIELDS);

    res.json(applications);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch business responses',
      error: error.message,
    });
  }
};

// @desc    Admin views all responses/applications
// @route   GET /api/applications/admin/all
// @access  Admin
const getAllApplicationsForAdmin = async (req, res) => {
  try {
    const applications = await Application.find()
      .sort({ createdAt: -1 })
      .populate('job', 'title companyName location jobType category')
      .populate('applicant', APPLICANT_PUBLIC_FIELDS);

    res.json(applications);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch all responses',
      error: error.message,
    });
  }
};

// @desc    Business owner/Admin updates response status and interview details
// @route   PUT /api/applications/:id/status
// @access  Employer/Admin
const updateApplicationStatus = async (req, res) => {
  try {
    const {
      status,
      employerNote,
      interviewDate,
      interviewMethod,
      interviewLocation,
    } = req.body;

    const allowedStatuses = [
      'submitted',
      'reviewed',
      'shortlisted',
      'contacted',
      'interviewing',
      'hired',
      'not_selected',
      'rejected',
    ];

    const allowedInterviewMethods = [
      '',
      'phone',
      'whatsapp',
      'in_person',
      'online',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid response status',
      });
    }

    if (
      interviewMethod !== undefined &&
      !allowedInterviewMethods.includes(interviewMethod)
    ) {
      return res.status(400).json({
        message: 'Invalid interview method',
      });
    }

    const application = await Application.findById(req.params.id).populate(
      'job'
    );

    if (!application) {
      return res.status(404).json({
        message: 'Response not found',
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isJobOwner =
      application.job.employer.toString() === req.user._id.toString();

    if (!isAdmin && !isJobOwner) {
      return res.status(403).json({
        message: 'You are not allowed to update this response',
      });
    }

    application.status = status;

    if (employerNote !== undefined) {
      application.employerNote = employerNote;
    }

    if (interviewDate !== undefined) {
      application.interviewDate = interviewDate || undefined;
    }

    if (interviewMethod !== undefined) {
      application.interviewMethod = interviewMethod;
    }

    if (interviewLocation !== undefined) {
      application.interviewLocation = interviewLocation;
    }

    const updatedApplication = await application.save();

    res.json({
      message: 'Response status updated successfully',
      application: updatedApplication,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update response status',
      error: error.message,
    });
  }
};
const downloadApplicationResume = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('job');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner =
      application.job.employer.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const resumeUrl = application.resumeUrl || application.applicationPdfUrl;

    if (!resumeUrl) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    return res.redirect(resumeUrl);
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to open resume',
      error: error.message,
    });
  }
};
module.exports = {
  applyForJob,
  getMyApplications,
  getEmployerApplications,
  getAllApplicationsForAdmin,
  updateApplicationStatus,
  downloadApplicationResume,
};