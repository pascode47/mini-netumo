import { Router } from 'express';
import {
  createTarget,
  getAllTargets,
  getTargetById,
  updateTarget,
  deleteTarget,
  getTargetUptimeSummary, // Import getTargetUptimeSummary
} from '../controllers/target.controller';
import { getTargetAlertHistory } from '../controllers/alert.controller'; // Import from alert controller

const router = Router();

// Route for creating a new target and getting all targets
router.route('/')
  .post(createTarget)
  .get(getAllTargets);

// Routes for a specific target by ID (get, update, delete)
router.route('/:id')
  .get(getTargetById)
  .put(updateTarget)
  .delete(deleteTarget);

// Route to get alert history for a specific target
router.route('/:targetId/alerts')
  .get(getTargetAlertHistory);

// Route to get uptime summary for a specific target
router.route('/:targetId/uptime-summary')
  .get(getTargetUptimeSummary);

export default router;
