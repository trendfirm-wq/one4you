const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
resumeUrl: {
  type: String,
  required: true,
},

resumeOriginalName: {
  type: String,
  default: '',
},
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: '',
      trim: true,
    },

    message: {
      type: String,
      default: '',
    },

    coverLetter: {
      type: String,
      default: '',
    },

    resumeLink: {
      type: String,
      default: '',
      trim: true,
    },

    applicationPdfUrl: {
      type: String,
      default: '',
      trim: true,
    },

    applicationPdfPublicId: {
      type: String,
      default: '',
      trim: true,
    },

    status: {
      type: String,
      enum: [
        'submitted',
        'reviewed',
        'shortlisted',
        'contacted',
        'interviewing',
        'hired',
        'not_selected',
        'rejected',
      ],
      default: 'submitted',
    },

    employerNote: {
      type: String,
      default: '',
      trim: true,
    },

    interviewDate: {
      type: Date,
    },

    interviewMethod: {
      type: String,
      enum: ['', 'phone', 'whatsapp', 'in_person', 'online'],
      default: '',
    },

    interviewLocation: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);