import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import connectDB from './config/database';
import targetRoutes from './routes/target.routes'; // Import target routes
import alertRoutes from './routes/alert.routes';   // Import alert routes
import './workers/monitoring.worker'; // Import to start the worker

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Basic Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Mini-Netumo Backend is running!');
});

// Mount Routers
app.use('/api/v1/targets', targetRoutes);
app.use('/api/v1/alerts', alertRoutes);

// Swagger/OpenAPI setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mini-Netumo API',
      version: '1.0.0',
      description: 'API documentation for the Mini-Netumo monitoring service.',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/v1`,
        description: 'Development server',
      },
    ],
    // Components (schemas) will be defined in JSDoc in controller/model files
  },
  // Path to the API docs (JSDoc comments)
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/models/*.ts'], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Global error handler (simple example)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;
