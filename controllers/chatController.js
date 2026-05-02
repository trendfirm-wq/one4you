const Application = require('../models/Application');
const ChatMessage = require('../models/ChatMessage');

const MESSAGE_POPULATE_FIELDS = 'name email phone role';

// Helper: check if current user is allowed to chat on this application
const getAllowedHiredApplication = async (applicationId, user) => {
  const application = await Application.findById(applicationId)
    .populate('job')
    .populate('applicant', MESSAGE_POPULATE_FIELDS);

  if (!application) {
    return {
      errorStatus: 404,
      errorMessage: 'Application not found',
    };
  }

  if (application.status !== 'hired') {
    return {
      errorStatus: 403,
      errorMessage: 'Chat is only available after the applicant has been hired',
    };
  }

  const isAdmin = user.role === 'admin';
  const isApplicant =
    application.applicant?._id?.toString() === user._id.toString();

  const isEmployer =
    application.job?.employer?.toString() === user._id.toString();

  if (!isAdmin && !isApplicant && !isEmployer) {
    return {
      errorStatus: 403,
      errorMessage: 'You are not allowed to access this chat',
    };
  }

  return { application, isApplicant, isEmployer, isAdmin };
};

// @desc    Get chat messages for a hired application
// @route   GET /api/chats/:applicationId/messages
// @access  Hired applicant / Employer / Admin
const getChatMessages = async (req, res) => {
  try {
    const result = await getAllowedHiredApplication(
      req.params.applicationId,
      req.user
    );

    if (result.errorStatus) {
      return res.status(result.errorStatus).json({
        message: result.errorMessage,
      });
    }

    await ChatMessage.updateMany(
      {
        application: req.params.applicationId,
        receiver: req.user._id,
        readByReceiver: false,
      },
      {
        readByReceiver: true,
      }
    );

   const messages = await ChatMessage.find({
  application: req.params.applicationId,
})
  .sort({ createdAt: 1 })
  .populate('sender', MESSAGE_POPULATE_FIELDS)
  .populate('receiver', MESSAGE_POPULATE_FIELDS)
  .populate('job', 'title companyName location category');
    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch chat messages',
      error: error.message,
    });
  }
};

// @desc    Send chat message for hired application
// @route   POST /api/chats/:applicationId/messages
// @access  Hired applicant / Employer / Admin
const sendChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: 'Message is required',
      });
    }

    const result = await getAllowedHiredApplication(
      req.params.applicationId,
      req.user
    );

    if (result.errorStatus) {
      return res.status(result.errorStatus).json({
        message: result.errorMessage,
      });
    }

    const { application, isApplicant, isEmployer, isAdmin } = result;

    let receiver = null;

    if (isApplicant) {
      receiver = application.job.employer;
    } else if (isEmployer) {
      receiver = application.applicant._id;
    } else if (isAdmin) {
      return res.status(400).json({
        message:
          'Admin can view hired chats, but cannot send messages as employer or applicant',
      });
    }

    const chatMessage = await ChatMessage.create({
      application: application._id,
      job: application.job._id,
      sender: req.user._id,
      receiver,
      message: message.trim(),
    });

  const populatedMessage = await ChatMessage.findById(chatMessage._id)
  .populate('sender', MESSAGE_POPULATE_FIELDS)
  .populate('receiver', MESSAGE_POPULATE_FIELDS)
  .populate('job', 'title companyName location category');

    res.status(201).json({
      message: 'Message sent successfully',
      chatMessage: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to send chat message',
      error: error.message,
    });
  }
};

// @desc    Get current user's hired chat list
// @route   GET /api/chats/my-hired-chats
// @access  Job seeker / Employer / Admin
const getMyHiredChats = async (req, res) => {
  try {
    let filter = {
      status: 'hired',
    };

    if (req.user.role === 'job_seeker') {
      filter.applicant = req.user._id;
    }

    let applicationsQuery = Application.find(filter)
      .sort({ updatedAt: -1 })
      .populate('applicant', MESSAGE_POPULATE_FIELDS)
      .populate('job', 'title companyName location category employer');

    let applications = await applicationsQuery;

    if (req.user.role === 'employer') {
      applications = applications.filter(
        (application) =>
          application.job?.employer?.toString() === req.user._id.toString()
      );
    }

    const chatList = await Promise.all(
      applications.map(async (application) => {
        const lastMessage = await ChatMessage.findOne({
          application: application._id,
        })
          .sort({ createdAt: -1 })
          .populate('sender', MESSAGE_POPULATE_FIELDS);

        const unreadCount = await ChatMessage.countDocuments({
          application: application._id,
          receiver: req.user._id,
          readByReceiver: false,
        });

        return {
          application,
          lastMessage,
          unreadCount,
        };
      })
    );

    res.json(chatList);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch hired chats',
      error: error.message,
    });
  }
};

module.exports = {
  getChatMessages,
  sendChatMessage,
  getMyHiredChats,
};