const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');

dotenv.config();

connectDB();

const createAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
    }

    const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
  existingAdmin.password = adminPassword;
  existingAdmin.role = 'admin';
  existingAdmin.emailVerified = true;
  existingAdmin.phoneVerified = true;
  existingAdmin.agreedToTerms = true;
  existingAdmin.isActive = true;

  await existingAdmin.save();

  console.log('Existing admin password reset successfully');
  process.exit(0);
}

    await User.create({
      name: 'One4You Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      emailVerified: true,
      phoneVerified: true,
      agreedToTerms: true,
      isActive: true,
    });

    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Create admin error:', error.message);
    process.exit(1);
  }
};

createAdmin();