const Job = require('../models/Job');
const User = require('../models/User');

const PLAN_LIMITS = {
  free: 5,
  business: 20,
  premium: 50,
  enterprise: 999999,
};

const EMPLOYER_PUBLIC_FIELDS =
  'name email phone companyName companyIndustry emailVerified phoneVerified';

const getUserCurrentPlan = (user) => {
  const now = new Date();

  if (
    user.plan !== 'free' &&
    user.subscriptionStatus === 'active' &&
    user.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) > now
  ) {
    return user.plan;
  }

  return 'free';
};

const resetMonthlyPostsIfNeeded = async (user) => {
  const now = new Date();
  const lastReset = user.lastPostReset ? new Date(user.lastPostReset) : null;

  const shouldReset =
    !lastReset ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();

  if (shouldReset) {
    user.postsUsedThisMonth = 0;
    user.lastPostReset = now;
    await user.save();
  }

  return user;
};

// @desc    Business owner creates an opportunity
// @route   POST /api/jobs
// @access  Employer/Admin
const createJob = async (req, res) => {
  try {
    const {
      title,
      category,
      location,
      jobType,
      salary,
      deadline,

      companyName,
      industry,
      companyWebsite,
      companyDescription,

      description,
      responsibilities,
      requirements,

      applicationMethod,
      applicationEmail,
      applicationLink,
      applicationInstructions,

      whatsappNumber,
      phoneNumber,

      contactName,
      contactEmail,
      contactPhone,
    } = req.body;

    if (
      !title ||
      !category ||
      !location ||
      !jobType ||
      !companyName ||
      !description ||
      !applicationMethod
    ) {
      return res.status(400).json({
        message:
          'Please provide title, category, location, opportunity type, business name, description and application method',
      });
    }

    if (applicationMethod === 'email' && !applicationEmail) {
      return res.status(400).json({
        message: 'Application email is required',
      });
    }

    if (applicationMethod === 'link' && !applicationLink) {
      return res.status(400).json({
        message: 'Application link is required',
      });
    }

    if (applicationMethod === 'whatsapp' && !whatsappNumber) {
      return res.status(400).json({
        message: 'WhatsApp number is required',
      });
    }

    if (applicationMethod === 'phone' && !phoneNumber) {
      return res.status(400).json({
        message: 'Phone number is required',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    await resetMonthlyPostsIfNeeded(user);

    const currentPlan = getUserCurrentPlan(user);
    const monthlyLimit = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;

    if (user.role !== 'admin' && user.postsUsedThisMonth >= monthlyLimit) {
      return res.status(403).json({
        message: `You have reached your ${currentPlan} plan posting limit. Upgrade your plan to post more opportunities.`,
        plan: currentPlan,
        monthlyLimit,
        postsUsedThisMonth: user.postsUsedThisMonth,
      });
    }

    const paidPlans = ['business', 'premium', 'enterprise'];
    const shouldAutoApprove =
      user.role === 'admin' || paidPlans.includes(currentPlan);

    const job = await Job.create({
      employer: req.user._id,

      title,
      category,
      location,
      jobType,
      salary: salary || '',
      deadline,

      companyName,
      industry: industry || '',
      companyWebsite: companyWebsite || '',
      companyDescription: companyDescription || '',

      description,
      responsibilities: responsibilities || '',
      requirements: requirements || '',

      applicationMethod,
      applicationEmail: applicationEmail || '',
      applicationLink: applicationLink || '',
      applicationInstructions: applicationInstructions || '',

      whatsappNumber: whatsappNumber || '',
      phoneNumber: phoneNumber || '',

      contactName: contactName || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',

      status: shouldAutoApprove ? 'approved' : 'pending',
      isActive: true,
    });

    if (user.role !== 'admin') {
      user.postsUsedThisMonth += 1;
      await user.save();
    }

    res.status(201).json({
      message: shouldAutoApprove
        ? 'Opportunity published successfully'
        : 'Opportunity submitted successfully and is pending admin review',
      job,
      plan: currentPlan,
      monthlyLimit,
      postsUsedThisMonth: user.postsUsedThisMonth,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create opportunity',
      error: error.message,
    });
  }
};

// @desc    Public users view approved opportunities
// @route   GET /api/jobs
// @access  Public
const getApprovedJobs = async (req, res) => {
  try {
    const {
      category,
      location,
      jobType,
      search,
      page = 1,
      limit = 12,
    } = req.query;

    const currentPage = Number(page) || 1;
    const pageLimit = Number(limit) || 12;
    const skip = (currentPage - 1) * pageLimit;

    const filter = {
      status: 'approved',
      isActive: true,
    };

    if (category) {
      filter.category = category;
    }

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (jobType) {
      filter.jobType = jobType;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Job.countDocuments(filter);

    const jobs = await Job.find(filter)
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .populate('employer', EMPLOYER_PUBLIC_FIELDS);

    res.json({
      jobs,
      page: currentPage,
      pages: Math.ceil(total / pageLimit),
      total,
      limit: pageLimit,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch opportunities',
      error: error.message,
    });
  }
};

// @desc    Public users view one approved opportunity
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      'employer',
      EMPLOYER_PUBLIC_FIELDS
    );

    if (!job) {
      return res.status(404).json({
        message: 'Opportunity not found',
      });
    }

    if (job.status !== 'approved') {
      return res.status(403).json({
        message: 'This opportunity is not available publicly',
      });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch opportunity',
      error: error.message,
    });
  }
};

// @desc    Business owner views own opportunities
// @route   GET /api/jobs/my-jobs
// @access  Employer/Admin
const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch your opportunities',
      error: error.message,
    });
  }
};

// @desc    Admin views all opportunities
// @route   GET /api/jobs/admin/all
// @access  Admin
const getAllJobsForAdmin = async (req, res) => {
  try {
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .populate('employer', EMPLOYER_PUBLIC_FIELDS);

    res.json(jobs);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch admin opportunities',
      error: error.message,
    });
  }
};

// @desc    Admin approves opportunity
// @route   PUT /api/jobs/admin/:id/approve
// @access  Admin
const approveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: 'Opportunity not found',
      });
    }

    job.status = 'approved';
    job.rejectionReason = '';
    job.isActive = true;

    const updatedJob = await job.save();

    res.json({
      message: 'Opportunity approved successfully',
      job: updatedJob,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to approve opportunity',
      error: error.message,
    });
  }
};

// @desc    Admin rejects opportunity
// @route   PUT /api/jobs/admin/:id/reject
// @access  Admin
const rejectJob = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: 'Opportunity not found',
      });
    }

    job.status = 'rejected';
    job.rejectionReason = rejectionReason || 'No reason provided';

    const updatedJob = await job.save();

    res.json({
      message: 'Opportunity rejected successfully',
      job: updatedJob,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to reject opportunity',
      error: error.message,
    });
  }
};

// @desc    Business owner/Admin updates opportunity
// @route   PUT /api/jobs/:id
// @access  Employer/Admin
const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: 'Opportunity not found',
      });
    }

    const isOwner = job.employer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'You are not allowed to update this opportunity',
      });
    }

    const fields = [
      'title',
      'category',
      'location',
      'jobType',
      'salary',
      'deadline',

      'companyName',
      'industry',
      'companyWebsite',
      'companyDescription',

      'description',
      'responsibilities',
      'requirements',

      'applicationMethod',
      'applicationEmail',
      'applicationLink',
      'applicationInstructions',

      'whatsappNumber',
      'phoneNumber',

      'contactName',
      'contactEmail',
      'contactPhone',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

    if (!isAdmin) {
      const user = await User.findById(req.user._id);
      const currentPlan = user ? getUserCurrentPlan(user) : 'free';
      const paidPlans = ['business', 'premium', 'enterprise'];

      job.status = paidPlans.includes(currentPlan) ? 'approved' : 'pending';
      job.rejectionReason = '';
    }

    const updatedJob = await job.save();

    res.json({
      message: 'Opportunity updated successfully',
      job: updatedJob,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update opportunity',
      error: error.message,
    });
  }
};

// @desc    Business owner/Admin deletes opportunity
// @route   DELETE /api/jobs/:id
// @access  Employer/Admin
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: 'Opportunity not found',
      });
    }

    const isOwner = job.employer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'You are not allowed to delete this opportunity',
      });
    }

    await job.deleteOne();

    res.json({
      message: 'Opportunity deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete opportunity',
      error: error.message,
    });
  }
};

// @desc    Business owner/Admin views one opportunity for editing
// @route   GET /api/jobs/employer/:id
// @access  Employer/Admin
const getEmployerJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: 'Opportunity not found',
      });
    }

    const isOwner = job.employer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'You are not allowed to view this opportunity',
      });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch opportunity for editing',
      error: error.message,
    });
  }
};

// @desc    Admin updates opportunity status
// @route   PATCH /api/jobs/admin/:id/status
// @access  Admin
const updateJobStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid opportunity status',
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: 'Opportunity not found',
      });
    }

    job.status = status;

    if (status === 'approved') {
      job.rejectionReason = '';
      job.isActive = true;
    }

    if (status === 'rejected') {
      job.rejectionReason = rejectionReason || 'No reason provided';
    }

    if (status === 'pending') {
      job.rejectionReason = '';
    }

    const updatedJob = await job.save();

    res.json({
      message: `Opportunity ${status} successfully`,
      job: updatedJob,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update opportunity status',
      error: error.message,
    });
  }
};

module.exports = {
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
};