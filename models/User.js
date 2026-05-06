const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: '',
      trim: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },

    /**
     * Role meaning for One4You:
     * admin      = Platform admin
     * employer   = Business owner
     * job_seeker = User / worker / opportunity seeker
     */
    role: {
      type: String,
      enum: ['admin', 'employer', 'job_seeker'],
      default: 'job_seeker',
    },

    // Verification
    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationCode: {
      type: String,
      default: '',
    },

    emailVerificationExpires: {
      type: Date,
    },

    phoneVerificationCode: {
      type: String,
      default: '',
    },

    phoneVerificationExpires: {
      type: Date,
    },

    // Business Owner Information
    companyName: {
      type: String,
      default: '',
      trim: true,
    },

    companyIndustry: {
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

    companyLogo: {
      type: String,
      default: '',
    },

    // User / Worker Profile
    location: {
      type: String,
      default: '',
      trim: true,
    },

    preferredJobCategory: {
      type: String,
      default: '',
      trim: true,
    },

    highestQualification: {
      type: String,
      default: '',
      trim: true,
    },

    experienceLevel: {
      type: String,
      enum: ['', 'Entry Level', 'Junior', 'Mid-Level', 'Senior'],
      default: '',
    },

    resumeUrl: {
      type: String,
      default: '',
    },

    // Plan / Subscription
    plan: {
  type: String,
  enum: ['free', 'starter', 'premium', 'enterprise'],
  default: 'free',
},

    subscriptionStatus: {
      type: String,
      enum: ['inactive', 'active', 'expired'],
      default: 'inactive',
    },

    subscriptionStart: {
      type: Date,
    },

    subscriptionExpiry: {
      type: Date,
    },

    postsUsedThisMonth: {
      type: Number,
      default: 0,
    },

    lastPostReset: {
      type: Date,
      default: Date.now,
    },

    paymentReference: {
      type: String,
      default: '',
    },

    paymentStatus: {
      type: String,
      enum: ['none', 'pending', 'completed', 'failed'],
      default: 'none',
    },

   pendingPlan: {
  type: String,
  enum: ['', 'starter', 'premium', 'enterprise'],
  default: '',
},

    cancelAtExpiry: {
      type: Boolean,
      default: false,
    },

    agreedToTerms: {
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

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);