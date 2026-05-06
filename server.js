const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('One4You API is running...');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/saved-jobs', require('./routes/savedJobRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/verification', require('./routes/verificationRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/polls', require('./routes/pollRoutes'));
app.use('/api/job-alerts', require('./routes/jobAlertRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`One4You server running on port ${PORT}`);
});