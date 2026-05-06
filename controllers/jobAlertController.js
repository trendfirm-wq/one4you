const JobAlert = require('../models/JobAlert');

const getMyJobAlerts = async (req, res) => {
  try {
    const alerts = await JobAlert.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch job alerts',
      error: error.message,
    });
  }
};

const createJobAlert = async (req, res) => {
  try {
    const { keyword, category, location, jobType } = req.body;

    const alert = await JobAlert.create({
      user: req.user._id,
      keyword: keyword || '',
      category: category || '',
      location: location || '',
      jobType: jobType || '',
    });

    res.status(201).json({
      message: 'Job alert created successfully',
      alert,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create job alert',
      error: error.message,
    });
  }
};

const updateJobAlert = async (req, res) => {
  try {
    const alert = await JobAlert.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!alert) {
      return res.status(404).json({ message: 'Job alert not found' });
    }

    const { keyword, category, location, jobType, isActive } = req.body;

    if (keyword !== undefined) alert.keyword = keyword;
    if (category !== undefined) alert.category = category;
    if (location !== undefined) alert.location = location;
    if (jobType !== undefined) alert.jobType = jobType;
    if (isActive !== undefined) alert.isActive = isActive;

    const updatedAlert = await alert.save();

    res.json({
      message: 'Job alert updated successfully',
      alert: updatedAlert,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update job alert',
      error: error.message,
    });
  }
};

const deleteJobAlert = async (req, res) => {
  try {
    const alert = await JobAlert.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!alert) {
      return res.status(404).json({ message: 'Job alert not found' });
    }

    res.json({ message: 'Job alert deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete job alert',
      error: error.message,
    });
  }
};

module.exports = {
  getMyJobAlerts,
  createJobAlert,
  updateJobAlert,
  deleteJobAlert,
};