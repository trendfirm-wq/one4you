const nodemailer = require('nodemailer');
const axios = require('axios');
const User = require('../models/User');

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getExpiryTime = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};
const sendVerificationSms = async ({ to, code }) => {
  if (
    !process.env.HUBTEL_SMS_CLIENT_ID ||
    !process.env.HUBTEL_SMS_CLIENT_SECRET ||
    !process.env.HUBTEL_SMS_SENDER_ID
  ) {
    throw new Error('Hubtel SMS settings are missing in environment variables');
  }

  const formattedPhone = formatGhanaPhoneNumber(to);

  if (!formattedPhone || !formattedPhone.startsWith('233')) {
    throw new Error('Invalid Ghana phone number');
  }

  const content = `Your One4You verification code is ${code}. It expires in 10 minutes.`;

  const response = await axios.get('https://smsc.hubtel.com/v1/messages/send', {
    params: {
      clientsecret: process.env.HUBTEL_SMS_CLIENT_SECRET,
      clientid: process.env.HUBTEL_SMS_CLIENT_ID,
      from: process.env.HUBTEL_SMS_SENDER_ID,
      to: formattedPhone,
      content,
    },
  });

  return response.data;
};
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email settings are missing in environment variables');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendVerificationEmail = async ({ to, name, code }) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"One4You" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your One4You email address',
    html: `
      <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:30px;">
        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:18px; padding:28px; border:1px solid #e2e8f0;">
          <h2 style="margin:0 0 12px; color:#0f172a;">Verify your email</h2>

          <p style="color:#475569; font-size:15px; line-height:1.7;">
            Hello ${name || 'there'}, use the verification code below to verify your One4You account.
          </p>

          <div style="margin:24px 0; padding:18px; border-radius:14px; background:#eff6ff; text-align:center;">
            <div style="font-size:34px; letter-spacing:8px; font-weight:800; color:#2563eb;">
              ${code}
            </div>
          </div>

          <p style="color:#64748b; font-size:14px;">
            This code will expire in 10 minutes. If you did not request this, you can ignore this email.
          </p>

          <p style="margin-top:24px; color:#0f172a; font-weight:700;">
            One4You Team
          </p>
        </div>
      </div>
    `,
  });
};

// @desc    Request email verification code
// @route   POST /api/verification/email/request
// @access  Private
const requestEmailVerification = async (req, res) => {
  try {
    console.log('EMAIL VERIFICATION REQUEST HIT');

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (!user.email) {
      return res.status(400).json({
        message: 'No email address found on this account',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Email is already verified',
      });
    }

    const code = generateCode();

    user.emailVerificationCode = code;
    user.emailVerificationExpires = getExpiryTime();

    await user.save();

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      code,
    });

    return res.json({
      message: 'Email verification code sent. Please check your email.',
    });
  } catch (error) {
    console.error('Email verification error:', error);

    return res.status(500).json({
      message: 'Failed to send email verification code',
      error: error.message,
    });
  }
};

// @desc    Confirm email verification code
// @route   POST /api/verification/email/confirm
// @access  Private
const confirmEmailVerification = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        message: 'Verification code is required',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Email is already verified',
      });
    }

    if (
      !user.emailVerificationCode ||
      user.emailVerificationCode !== code.trim() ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      return res.status(400).json({
        message: 'Invalid or expired email verification code',
      });
    }

    user.emailVerified = true;
    user.emailVerificationCode = '';
    user.emailVerificationExpires = undefined;

    await user.save();

    return res.json({
      message: 'Email verified successfully',
      emailVerified: true,
    });
  } catch (error) {
    console.error('Email confirmation error:', error);

    return res.status(500).json({
      message: 'Failed to verify email',
      error: error.message,
    });
  }
};
// @desc    Request phone verification code
// @route   POST /api/verification/phone/request
// @access  Private
const requestPhoneVerification = async (req, res) => {
  try {
    console.log('PHONE VERIFICATION REQUEST HIT');

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (!user.phone) {
      return res.status(400).json({
        message: 'No phone number found on this account',
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({
        message: 'Phone number is already verified',
      });
    }

    const code = generateCode();

    user.phoneVerificationCode = code;
    user.phoneVerificationExpires = getExpiryTime();

    await user.save();

    await sendVerificationSms({
      to: user.phone,
      code,
    });

    return res.json({
      message: 'Phone verification code sent. Please check your SMS.',
    });
  } catch (error) {
    console.error('Phone verification error:', error.response?.data || error);

    return res.status(500).json({
      message: 'Failed to send phone verification code',
      error: error.response?.data?.message || error.message,
    });
  }
};
// @desc    Confirm phone verification code
// @route   POST /api/verification/phone/confirm
// @access  Private
const confirmPhoneVerification = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        message: 'Verification code is required',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({
        message: 'Phone number is already verified',
      });
    }

    if (
      !user.phoneVerificationCode ||
      user.phoneVerificationCode !== code.trim() ||
      !user.phoneVerificationExpires ||
      user.phoneVerificationExpires < new Date()
    ) {
      return res.status(400).json({
        message: 'Invalid or expired phone verification code',
      });
    }

    user.phoneVerified = true;
    user.phoneVerificationCode = '';
    user.phoneVerificationExpires = undefined;

    await user.save();

    return res.json({
      message: 'Phone number verified successfully',
      phoneVerified: true,
    });
  } catch (error) {
    console.error('Phone confirmation error:', error);

    return res.status(500).json({
      message: 'Failed to verify phone number',
      error: error.message,
    });
  }
};
module.exports = {
  requestEmailVerification,
  confirmEmailVerification,
  requestPhoneVerification,
  confirmPhoneVerification,
};