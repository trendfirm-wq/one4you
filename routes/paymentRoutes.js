const express = require('express');
const axios = require('axios');

const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const PLANS = {
  starter: {
    amount: 55,
    postLimit: 15,
  },
  premium: {
    amount: 450,
    postLimit: 120,
  },
  enterprise: {
    amount: 2500,
    postLimit: 999999,
  },
};
const getExpiryDate = () => {
  const start = new Date();
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + 1);
  return { start, expiry };
};

// ===================================================
// 1. CREATE HUBTEL PAYMENT
// ===================================================
router.post('/hubtel/pay', protect, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({
        message: 'Invalid plan selected',
      });
    }

    const user = await User.findById(req.user._id);
if (user.plan === 'business') {
  user.plan = 'starter';
}

if (user.pendingPlan === 'business') {
  user.pendingPlan = 'starter';
}
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (user.role !== 'employer' && user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only business owners can upgrade plans',
      });
    }

    if (
      user.subscriptionStatus === 'active' &&
      user.subscriptionExpiry &&
      new Date(user.subscriptionExpiry) <= new Date()
    ) {
      user.subscriptionStatus = 'expired';
      user.plan = 'free';
      await user.save();
    }

    if (
      user.subscriptionStatus === 'active' &&
      user.plan === plan &&
      user.subscriptionExpiry &&
      new Date(user.subscriptionExpiry) > new Date()
    ) {
      return res.status(400).json({
        message: 'You already have this active plan',
      });
    }

    const amount = PLANS[plan].amount;
    const reference = `ONE4YOU_${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}`;

    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString('base64');

    user.paymentReference = reference;
    user.paymentStatus = 'pending';
    user.pendingPlan = plan;
    await user.save();
console.log('PAYMENT ENV CHECK:', {
  hasClientId: Boolean(process.env.HUBTEL_CLIENT_ID),
  hasClientSecret: Boolean(process.env.HUBTEL_CLIENT_SECRET),
  merchantId: process.env.HUBTEL_MERCHANT_ID,
  merchantAccountNumber: process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER,
  callbackUrl: process.env.HUBTEL_CALLBACK_URL,
  returnUrl: process.env.HUBTEL_RETURN_URL,
  cancelUrl: process.env.HUBTEL_CANCEL_URL,
});
    const payload = {
      totalAmount: Number(amount.toFixed(2)),
      description: `One4You ${plan} plan subscription`,
      callbackUrl: process.env.HUBTEL_CALLBACK_URL,
      returnUrl: process.env.HUBTEL_RETURN_URL,
      cancellationUrl:
        process.env.HUBTEL_CANCEL_URL || process.env.HUBTEL_RETURN_URL,
      merchantAccountNumber:
        process.env.HUBTEL_MERCHANT_ID ||
        process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER,
      clientReference: reference,
    };

    console.log('HUBTEL REQUEST:', payload);

    const response = await axios.post(
      'https://payproxyapi.hubtel.com/items/initiate',
      payload,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('HUBTEL RESPONSE:', response.data);

    const checkoutUrl = response.data?.data?.checkoutUrl;

    if (!checkoutUrl) {
      user.paymentStatus = 'failed';
      await user.save();

      return res.status(500).json({
        message: 'No checkout URL returned from Hubtel',
      });
    }

    return res.json({
      success: true,
      checkoutUrl,
      reference,
      plan,
      amount,
    });
  } catch (error) {
    console.log('HUBTEL ERROR:', error.response?.data || error.message);

    try {
      const user = await User.findById(req.user?._id);
      if (user) {
        user.paymentStatus = 'failed';
        await user.save();
      }
    } catch (saveError) {
      console.log('FAILED TO MARK PAYMENT FAILED:', saveError.message);
    }

    return res.status(500).json({
      message: 'Hubtel payment failed',
      error: error.response?.data || error.message,
    });
  }
});

// ===================================================
// 2. HUBTEL CALLBACK
// ===================================================
router.post('/hubtel/callback', async (req, res) => {
  try {
    console.log('HUBTEL CALLBACK BODY:', JSON.stringify(req.body, null, 2));

    const reference =
      req.body.clientReference ||
      req.body.ClientReference ||
      req.body.Data?.ClientReference ||
      req.body.data?.clientReference ||
      req.body.Response?.ClientReference;

    const status =
      req.body.status ||
      req.body.Status ||
      req.body.ResponseCode ||
      req.body.Data?.Status ||
      req.body.data?.status ||
      req.body.Response?.Status;

    console.log('Extracted reference:', reference);
    console.log('Extracted status:', status);

    if (!reference) {
      return res.status(400).json({
        message: 'No payment reference found in callback',
      });
    }

    const user = await User.findOne({ paymentReference: reference });
if (user.plan === 'business') {
  user.plan = 'starter';
}

if (user.pendingPlan === 'business') {
  user.pendingPlan = 'starter';
}
    if (!user) {
      console.log('No user found for reference:', reference);
      return res.status(404).json({
        message: 'User not found for reference',
      });
    }

    const paid =
      String(status).toLowerCase() === 'success' ||
      String(status).toLowerCase() === 'successful' ||
      String(status).toLowerCase() === 'paid' ||
      String(status) === '0000';

    if (!paid) {
      user.paymentStatus = 'failed';
      await user.save();

      return res.status(200).json({
        message: 'Payment not successful',
      });
    }

    const plan = user.pendingPlan;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({
        message: 'No valid pending plan found',
      });
    }

    const { start, expiry } = getExpiryDate();

    user.paymentStatus = 'completed';
    user.subscriptionStatus = 'active';
    user.plan = plan;
    user.subscriptionStart = start;
    user.subscriptionExpiry = expiry;
    user.pendingPlan = '';
    user.postsUsedThisMonth = 0;
    user.lastPostReset = new Date();
    user.cancelAtExpiry = false;

    await user.save();

    console.log('ONE4YOU PLAN ACTIVATED:', user.email, plan);

    return res.status(200).json({
      message: 'Callback processed successfully',
    });
  } catch (error) {
    console.error('HUBTEL CALLBACK ERROR:', error);

    return res.status(500).json({
      message: 'Server error in callback',
    });
  }
});

// ===================================================
// 3. CHECK PAYMENT STATUS
// ===================================================
router.get('/hubtel/status/:reference', protect, async (req, res) => {
  try {
    const { reference } = req.params;

    const user = await User.findOne({
      _id: req.user._id,
      paymentReference: reference,
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'Payment record not found',
      });
    }

    return res.json({
      success: true,
      paymentReference: user.paymentReference,
      paymentStatus: user.paymentStatus,
      subscriptionStatus: user.subscriptionStatus,
      plan: user.plan,
      subscriptionStart: user.subscriptionStart,
      subscriptionExpiry: user.subscriptionExpiry,
      postsUsedThisMonth: user.postsUsedThisMonth || 0,
      monthlyPostLimit:
  user.plan === 'free' ? 5 : PLANS[user.plan]?.postLimit || 5,
    });
  } catch (error) {
    console.error('PAYMENT STATUS ERROR:', error);

    return res.status(500).json({
      message: 'Server error',
    });
  }
});

// ===================================================
// 4. CANCEL SUBSCRIPTION AT EXPIRY
// ===================================================
router.post('/cancel', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (user.subscriptionStatus !== 'active') {
      return res.status(400).json({
        message: 'No active subscription to cancel',
      });
    }

    if (user.cancelAtExpiry) {
      return res.status(400).json({
        message: 'Subscription already set to cancel',
      });
    }

    user.cancelAtExpiry = true;
    await user.save();

    return res.json({
      success: true,
      message: 'Subscription will end on expiry date',
      cancelAtExpiry: true,
      subscriptionExpiry: user.subscriptionExpiry,
    });
  } catch (error) {
    console.error('CANCEL SUBSCRIPTION ERROR:', error);

    return res.status(500).json({
      message: 'Server error',
    });
  }
});

module.exports = router;