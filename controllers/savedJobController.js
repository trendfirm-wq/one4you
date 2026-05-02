const SavedJob = require('../models/SavedJob');
const Job = require('../models/Job');

// @desc    Save an opportunity
// @route   POST /api/saved-jobs/:jobId
// @access  User/Admin
const saveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        message: 'Opportunity not found',
      });
    }

    if (job.status !== 'approved' || !job.isActive) {
      return res.status(400).json({
        message: 'You can only save approved active opportunities',
      });
    }

    const alreadySaved = await SavedJob.findOne({
      job: job._id,
      user: req.user._id,
    });

    if (alreadySaved) {
      return res.status(400).json({
        message: 'Opportunity already saved',
      });
    }

    const savedJob = await SavedJob.create({
      job: job._id,
      user: req.user._id,
    });

    res.status(201).json({
      message: 'Opportunity saved successfully',
      savedJob,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save opportunity',
      error: error.message,
    });
  }
};

// @desc    Get my saved opportunities
// @route   GET /api/saved-jobs/my
// @access  User/Admin
const getMySavedJobs = async (req, res) => {
  try {
    const savedJobs = await SavedJob.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate(
        'job',
        'title companyName location jobType category industry salary deadline status applicationMethod applicationEmail applicationLink whatsappNumber phoneNumber'
      );

    res.json(savedJobs);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch saved opportunities',
      error: error.message,
    });
  }
};

// @desc    Remove saved opportunity
// @route   DELETE /api/saved-jobs/:jobId
// @access  User/Admin
const removeSavedJob = async (req, res) => {
  try {
    const savedJob = await SavedJob.findOne({
      job: req.params.jobId,
      user: req.user._id,
    });

    if (!savedJob) {
      return res.status(404).json({
        message: 'Saved opportunity not found',
      });
    }

    await savedJob.deleteOne();

    res.json({
      message: 'Saved opportunity removed successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to remove saved opportunity',
      error: error.message,
    });
  }
};

module.exports = {
  saveJob,
  getMySavedJobs,
  removeSavedJob,
};