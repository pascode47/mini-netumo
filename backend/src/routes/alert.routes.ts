import { Router } from 'express';
import {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
} from '../controllers/alert.controller';

const router = Router();

// Route for getting all alerts
router.route('/')
  .get(getAllAlerts);

// Route for a specific alert by ID (get, acknowledge)
router.route('/:id')
  .get(getAlertById);

router.route('/:id/acknowledge')
  .put(acknowledgeAlert); // Using PUT to update the alert's status

export default router;
