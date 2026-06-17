import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/index';

dotenv.config();

// Sample data
const usersData = [
  {
    fullName: 'Testing Admin',
    email: 'admin@gmail.com',
    phoneNumber: '01735566789',
    password: '$2a$08$cUQ3uMdbQjlyDF/dgn5mNuEt9fLJZqq8TaT9aKabrFuG5wND3/mPO',
    authProvider: 'email',
    role: 'admin',
    isEmailVerified: true,
  },
  {
    fullName: 'Testing Employee',
    email: 'employee@gmail.com',
    phoneNumber: '01735566789',
    password: '$2a$08$cUQ3uMdbQjlyDF/dgn5mNuEt9fLJZqq8TaT9aKabrFuG5wND3/mPO',
    authProvider: 'email',
    role: 'employee',
    isEmailVerified: true,
  },
  {
    fullName: 'Testing Client',
    email: 'client@gmail.com',
    phoneNumber: '01734456873',
    password: '$2a$08$cUQ3uMdbQjlyDF/dgn5mNuEt9fLJZqq8TaT9aKabrFuG5wND3/mPO',
    authProvider: 'email',
    role: 'client',
    isEmailVerified: true,
  },
];

// Function to drop the entire database
const dropDatabase = async () => {
  try {
    await mongoose.connection.dropDatabase();
  } catch (err) {
    /* empty */
  }
};

// Function to seed users
const seedUsers = async () => {
  try {
    await User.deleteMany();
    await User.insertMany(usersData);
  } catch (err) {
    /* empty */
  }
};

// Connect to MongoDB
const mongoUrl = process.env.MONGODB_URL;
if (!mongoUrl) {
  throw new Error('MONGODB_URL is required');
}
mongoose.connect(mongoUrl);

// Call seeding functions
const seedDatabase = async () => {
  try {
    await dropDatabase();
    await seedUsers();
  } catch (err) {
    /* empty */
  } finally {
    mongoose.disconnect();
  }
};

// Execute seeding
seedDatabase();
