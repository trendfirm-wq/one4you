// routes/subscriptionRoutes.js
const express = require('express');
const axios = require('axios');

const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const PLANS = {
  monthly: {
    amount: 50,
    days: 30,
  },
  quarterly: {
    amount: 130,
    days: 90,
  },
  yearly: {
    amount: 450,
    days: 365,
  },
};

const getExpiryDate = (days) => {
  const start = new Date();
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + days);
  return { start, expiry };
};

router.get('/me', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active',
    }).sort({ createdAt: -1 });

    res.json({
      subscriptionStatus: req.user.subscriptionStatus,
      subscriptionExpiry: req.user.subscriptionExpiry,
      subscription,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch subscription',
      error: error.message,
    });
  }
});

router.post('/hubtel/pay', protect, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const amount = PLANS[plan].amount;
    const reference = `QALBIA_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const authHeader = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
    ).toString('base64');

    user.paymentReference = reference;
    user.paymentStatus = 'pending';
    user.pendingPlan = plan;
    await user.save();

    const payload = {
      totalAmount: Number(amount.toFixed(2)),
      description: `Qalbia ${plan} premium subscription`,
      callbackUrl: process.env.HUBTEL_CALLBACK_URL,
      returnUrl: process.env.HUBTEL_RETURN_URL,
      cancellationUrl: process.env.HUBTEL_CANCEL_URL || process.env.HUBTEL_RETURN_URL,
      merchantAccountNumber:
        process.env.HUBTEL_MERCHANT_ID ||
        process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER,
      clientReference: reference,
    };

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

    const checkoutUrl = response.data?.data?.checkoutUrl;

    if (!checkoutUrl) {
      user.paymentStatus = 'failed';
      await user.save();
      return res.status(500).json({ message: 'No checkout URL returned from Hubtel' });
    }

    res.json({
      success: true,
      checkoutUrl,
      reference,
      plan,
      amount,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Hubtel payment failed',
      error: error.response?.data || error.message,
    });
  }
});

router.post('/hubtel/callback', async (req, res) => {
  try {
    const reference =
      req.body.clientReference ||
      req.body.ClientReference ||
      req.body.Data?.ClientReference ||
      req.body.data?.clientReference;

    const status =
      req.body.status ||
      req.body.Status ||
      req.body.ResponseCode ||
      req.body.Data?.Status ||
      req.body.data?.status;

    if (!reference) {
      return res.status(400).json({ message: 'No payment reference found' });
    }

    const user = await User.findOne({ paymentReference: reference });

    if (!user) {
      return res.status(404).json({ message: 'User not found for reference' });
    }

    const paid =
      String(status).toLowerCase() === 'success' ||
      String(status).toLowerCase() === 'successful' ||
      String(status).toLowerCase() === 'paid' ||
      String(status) === '0000';

    if (!paid) {
      user.paymentStatus = 'failed';
      await user.save();
      return res.status(200).json({ message: 'Payment not successful' });
    }

    const plan = user.pendingPlan;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ message: 'No valid pending plan found' });
    }

    const { start, expiry } = getExpiryDate(PLANS[plan].days);

    const subscription = await Subscription.create({
      user: user._id,
      plan,
      amount: PLANS[plan].amount,
      status: 'active',
      paymentProvider: 'hubtel',
      transactionId: reference,
      expiryDate: expiry,
    });

    user.paymentStatus = 'completed';
    user.subscriptionStatus = 'premium';
    user.subscriptionPlan = plan;
    user.subscriptionStart = start;
    user.subscriptionExpiry = expiry;
    user.pendingPlan = '';

    await user.save();

    res.status(200).json({
      message: 'Qalbia premium activated successfully',
      subscription,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error in callback' });
  }
});

router.get('/hubtel/status/:reference', protect, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user._id,
      paymentReference: req.params.reference,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    res.json({
      success: true,
      paymentReference: user.paymentReference,
      paymentStatus: user.paymentStatus,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStart: user.subscriptionStart,
      subscriptionExpiry: user.subscriptionExpiry,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;