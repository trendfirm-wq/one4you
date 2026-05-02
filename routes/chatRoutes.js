const express = require('express');

const {
  getChatMessages,
  sendChatMessage,
  getMyHiredChats,
} = require('../controllers/chatController');

const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/my-hired-chats',
  protect,
  allowRoles('job_seeker', 'employer', 'admin'),
  getMyHiredChats
);

router.get(
  '/:applicationId/messages',
  protect,
  allowRoles('job_seeker', 'employer', 'admin'),
  getChatMessages
);

router.post(
  '/:applicationId/messages',
  protect,
  allowRoles('job_seeker', 'employer'),
  sendChatMessage
);

module.exports = router;