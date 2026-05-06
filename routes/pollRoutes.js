const express = require('express');

const {
  getHomeOpportunityPoll,
  voteHomeOpportunityPoll,
} = require('../controllers/pollController');

const { protectOptional } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/home-opportunity-status', protectOptional, getHomeOpportunityPoll);
router.post(
  '/home-opportunity-status/vote',
  protectOptional,
  voteHomeOpportunityPoll
);

module.exports = router;