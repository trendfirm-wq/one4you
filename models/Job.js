const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 1. Basic Opportunity Information
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true,
    },

    category: {
      type: String,
      enum: [
        'Technology & IT',
        'Business, Administration & Customer Service',
        'Sales & Marketing',
        'Finance & Accounting',
        'Engineering & Technical',
        'Healthcare & Medical',
        'Education & Training',
        'Transport & Logistics',
        'Skilled Trades',
        'Hospitality, Travel & Services',
        'Creative & Design',
        'NGO & Development',
        'Food & Catering',
        'Fashion & Beauty',
        'Repairs & Maintenance',
        'Cleaning Services',
        'Delivery & Errands',
        'Events & Decoration',
        'Other',
      ],
      required: [true, 'Category is required'],
    },

    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },

    jobType: {
      type: String,
      enum: [
        'Full-time',
        'Part-time',
        'Contract',
        'Internship',
        'Remote',
        'Service Request',
        'Short-term Gig',
        'Business Offer',
      ],
      required: [true, 'Opportunity type is required'],
    },

    salary: {
      type: String,
      default: '',
      trim: true,
    },

    deadline: {
      type: Date,
    },

    // 2. Business Information
    companyName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },

    industry: {
      type: String,
      default: '',
      trim: true,
    },

    companyWebsite: {
      type: String,
      default: '',
      trim: true,
    },

    companyDescription: {
      type: String,
      default: '',
    },

    // 3. Opportunity Details
    description: {
      type: String,
      required: [true, 'Opportunity description is required'],
    },

    responsibilities: {
      type: String,
      default: '',
    },

    requirements: {
      type: String,
      default: '',
    },

    // 4. How to Apply or Respond
    applicationMethod: {
      type: String,
      enum: ['email', 'link', 'platform', 'whatsapp', 'phone'],
      required: true,
    },

    applicationEmail: {
      type: String,
      default: '',
      trim: true,
    },

    applicationLink: {
      type: String,
      default: '',
      trim: true,
    },

    applicationInstructions: {
      type: String,
      default: '',
    },

    whatsappNumber: {
      type: String,
      default: '',
      trim: true,
    },

    phoneNumber: {
      type: String,
      default: '',
      trim: true,
    },

    // 5. Business Contact Details — admin/business dashboard only
    contactName: {
      type: String,
      default: '',
      trim: true,
    },

    contactEmail: {
      type: String,
      default: '',
      trim: true,
    },

    contactPhone: {
      type: String,
      default: '',
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    rejectionReason: {
      type: String,
      default: '',
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Job', jobSchema);