const mongoose = require('mongoose');

const jobAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    keyword: {
      type: String,
      default: '',
      trim: true,
    },

    category: {
      type: String,
      default: '',
      trim: true,
    },

    location: {
      type: String,
      default: '',
      trim: true,
    },

    jobType: {
      type: String,
      default: '',
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobAlert', jobAlertSchema);