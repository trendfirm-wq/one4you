const User = require('../models/User');
const generateToken = require('../utils/generateToken');

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

const getPlanLimit = (plan) => {
  const limits = {
    free: 5,
    business: 20,
    premium: 50,
    enterprise: 999999,
  };

  return limits[plan] || limits.free;
};

const formatUserResponse = (user) => {
  const currentPlan = getUserCurrentPlan(user);
  const monthlyPostLimit = getPlanLimit(currentPlan);

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,

    emailVerified: Boolean(user.emailVerified),
    phoneVerified: Boolean(user.phoneVerified),

    companyName: user.companyName,
    companyIndustry: user.companyIndustry,
    companyWebsite: user.companyWebsite,
    companyDescription: user.companyDescription,
    companyLogo: user.companyLogo,

    location: user.location,
    preferredJobCategory: user.preferredJobCategory,
    highestQualification: user.highestQualification,
    experienceLevel: user.experienceLevel,
    resumeUrl: user.resumeUrl,

    plan: currentPlan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStart: user.subscriptionStart,
    subscriptionExpiry: user.subscriptionExpiry,
    postsUsedThisMonth: user.postsUsedThisMonth || 0,
    monthlyPostLimit,

    agreedToTerms: user.agreedToTerms,
    token: generateToken(user._id),
  };
};

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      role,
      phone,

      companyName,
      companyIndustry,
      companyWebsite,
      companyDescription,
      companyLogo,

      location,
      preferredJobCategory,
      highestQualification,
      experienceLevel,
      resumeUrl,

      agreedToTerms,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Please provide name, email and password',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match',
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({
        message: 'You must agree to the Terms of Use and Privacy Policy',
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: 'User already exists',
      });
    }

    const allowedRoles = ['employer', 'job_seeker'];

    let selectedRole = 'job_seeker';

    if (role && allowedRoles.includes(role)) {
      selectedRole = role;
    }

    if (selectedRole === 'employer') {
      if (!companyName || !companyIndustry) {
        return res.status(400).json({
          message: 'Business name and business industry are required',
        });
      }
    }

    if (selectedRole === 'job_seeker') {
      if (
        !phone ||
        !location ||
        !preferredJobCategory ||
        !highestQualification ||
        !experienceLevel
      ) {
        return res.status(400).json({
          message:
            'Phone, location, preferred opportunity category, highest qualification and experience level are required',
        });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role: selectedRole,
      phone: phone || '',

      companyName: selectedRole === 'employer' ? companyName || '' : '',
      companyIndustry: selectedRole === 'employer' ? companyIndustry || '' : '',
      companyWebsite: selectedRole === 'employer' ? companyWebsite || '' : '',
      companyDescription:
        selectedRole === 'employer' ? companyDescription || '' : '',
      companyLogo: selectedRole === 'employer' ? companyLogo || '' : '',

      location: selectedRole === 'job_seeker' ? location || '' : '',
      preferredJobCategory:
        selectedRole === 'job_seeker' ? preferredJobCategory || '' : '',
      highestQualification:
        selectedRole === 'job_seeker' ? highestQualification || '' : '',
      experienceLevel:
        selectedRole === 'job_seeker' ? experienceLevel || '' : '',
      resumeUrl: selectedRole === 'job_seeker' ? resumeUrl || '' : '',

      plan: 'free',
      subscriptionStatus: 'inactive',
      postsUsedThisMonth: 0,
      lastPostReset: new Date(),

      emailVerified: false,
      phoneVerified: false,

      agreedToTerms: Boolean(agreedToTerms),
    });

    res.status(201).json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({
      message: 'Registration failed',
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account has been disabled',
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    res.json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({
      message: 'Login failed',
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  res.json(formatUserResponse(req.user));
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};