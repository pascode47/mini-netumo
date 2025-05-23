import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGO_URI is not defined in the .env file');
  process.exit(1); // Exit the process with an error code
}

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    mongoose.connection.on('error', (err: Error) => {
      console.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error instanceof Error ? error.message : error);
    process.exit(1); // Exit the process with an error code
  }
};

export default connectDB;
