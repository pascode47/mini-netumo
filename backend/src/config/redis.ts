import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

let redisClient: RedisClientType;

const redisOptions: any = {
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
};

if (REDIS_PASSWORD) {
  redisOptions.password = REDIS_PASSWORD;
}

redisClient = createClient(redisOptions);

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('Redis client connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
    console.log('Redis client disconnected due to app termination');
  }
  process.exit(0);
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
      // Depending on the application's needs, you might want to exit or handle this differently
      // process.exit(1); 
    }
  }
};

// Automatically connect on import, or you can export connectRedis and call it in index.ts
// For BullMQ, the connection is often managed by the Queue/Worker instances themselves.
// However, having a general client can be useful for other caching purposes.
// Let's connect it here for now.
connectRedis();

export { redisClient, connectRedis };
