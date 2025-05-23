import { Request, Response } from 'express';
import TargetModel, { ITarget } from '../models/target.model';
import asyncHandler from '../utils/asyncHandler';
import { isValidObjectId } from 'mongoose';
import { 
  addHttpMonitoringJob, 
  addSslMonitoringJob, 
  addDomainMonitoringJob,
  removeMonitoringJob 
} from '../queues/monitoring.queue';
import AlertModel, { IAlert } from '../models/alert.model'; // Import AlertModel and IAlert

/**
 * @openapi
 * /targets:
 *   post:
 *     summary: Create a new monitoring target
 *     tags: [Targets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TargetInput'
 *     responses:
 *       201:
 *         description: Target created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Target'
 *       400:
 *         description: Invalid input (e.g., missing URL, invalid URL format).
 *       409:
 *         description: Target with this URL already exists.
 */
const createTarget = asyncHandler(async (req: Request, res: Response) => {
  const { url, name, checkIntervalMinutes, notificationEmail, notificationWebhookUrl } = req.body;

  if (!url) {
    res.status(400).json({ success: false, message: 'URL is required' });
    return;
  }

  try {
    new URL(url);
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid URL format' });
    return;
  }

  const existingTarget = await TargetModel.findOne({ url });
  if (existingTarget) {
    res.status(409).json({ success: false, message: 'Target with this URL already exists' });
    return;
  }

  const newTargetData: Partial<ITarget> = { url };
  if (name) newTargetData.name = name;
  if (checkIntervalMinutes) newTargetData.checkIntervalMinutes = parseInt(checkIntervalMinutes, 10);
  if (notificationEmail) newTargetData.notificationEmail = notificationEmail;
  if (notificationWebhookUrl) newTargetData.notificationWebhookUrl = notificationWebhookUrl;
  
  const newTarget = await TargetModel.create(newTargetData);
  
  if (newTarget.isActive) {
    await addHttpMonitoringJob(newTarget.id, newTarget.url, newTarget.checkIntervalMinutes);
    await addSslMonitoringJob(newTarget.id, newTarget.url);
    await addDomainMonitoringJob(newTarget.id, newTarget.url);
  }

  res.status(201).json({ success: true, data: newTarget });
});

/**
 * @openapi
 * /targets:
 *   get:
 *     summary: Retrieve a list of all monitoring targets
 *     tags: [Targets]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of targets per page.
 *     responses:
 *       200:
 *         description: A list of targets.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Target'
 */
const getAllTargets = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const skip = (page - 1) * limit;

  const targets = await TargetModel.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const totalTargets = await TargetModel.countDocuments();

  res.status(200).json({
    success: true,
    count: targets.length,
    totalPages: Math.ceil(totalTargets / limit),
    currentPage: page,
    data: targets,
  });
});

/**
 * @openapi
 * /targets/{id}:
 *   get:
 *     summary: Retrieve a single monitoring target by its ID
 *     tags: [Targets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the target to retrieve.
 *     responses:
 *       200:
 *         description: Detailed information about the target.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Target'
 *       400:
 *         description: Invalid target ID format.
 *       404:
 *         description: Target not found.
 */
const getTargetById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid target ID format' });
    return;
  }
  const target = await TargetModel.findById(id);
  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  res.status(200).json({ success: true, data: target });
});

/**
 * @openapi
 * /targets/{id}:
 *   put:
 *     summary: Update an existing monitoring target
 *     tags: [Targets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the target to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TargetInput'
 *     responses:
 *       200:
 *         description: Target updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Target'
 *       400:
 *         description: Invalid target ID format or invalid input.
 *       404:
 *         description: Target not found.
 */
const updateTarget = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, checkIntervalMinutes, isActive, notificationEmail, notificationWebhookUrl } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid target ID format' });
    return;
  }

  let target = await TargetModel.findById(id);
  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  const updateData: Partial<ITarget> = {};
  if (name !== undefined) updateData.name = name;
  if (checkIntervalMinutes !== undefined) updateData.checkIntervalMinutes = parseInt(checkIntervalMinutes, 10);
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (notificationEmail !== undefined) updateData.notificationEmail = notificationEmail;
  if (notificationWebhookUrl !== undefined) updateData.notificationWebhookUrl = notificationWebhookUrl;
  
  if (isActive === false && target.isActive === true) {
    updateData.status = 'PAUSED';
    await removeMonitoringJob('http-check', target.id);
    await removeMonitoringJob('ssl-check', target.id);
    await removeMonitoringJob('domain-check', target.id);
  } else if (isActive === true && target.isActive === false) {
    updateData.status = 'UNKNOWN';
    await addHttpMonitoringJob(target.id, target.url, updateData.checkIntervalMinutes || target.checkIntervalMinutes);
    await addSslMonitoringJob(target.id, target.url);
    await addDomainMonitoringJob(target.id, target.url);
  }

  const oldInterval = target.checkIntervalMinutes;
  target = await TargetModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found after update' });
    return;
  }

  if (updateData.checkIntervalMinutes !== undefined && updateData.checkIntervalMinutes !== oldInterval && target.isActive) {
    await removeMonitoringJob('http-check', target.id);
    await addHttpMonitoringJob(target.id, target.url, target.checkIntervalMinutes);
  }

  res.status(200).json({ success: true, data: target });
});

/**
 * @openapi
 * /targets/{id}:
 *   delete:
 *     summary: Delete a monitoring target
 *     tags: [Targets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the target to delete.
 *     responses:
 *       200:
 *         description: Target deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid target ID format.
 *       404:
 *         description: Target not found.
 */
const deleteTarget = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid target ID format' });
    return;
  }
  const target = await TargetModel.findById(id);
  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }
  await TargetModel.findByIdAndDelete(id);
  await removeMonitoringJob('http-check', target.id);
  await removeMonitoringJob('ssl-check', target.id);
  await removeMonitoringJob('domain-check', target.id);
  res.status(200).json({ success: true, message: 'Target deleted successfully' });
});

export {
  createTarget,
  getAllTargets,
  getTargetById,
  updateTarget,
  deleteTarget,
};

/**
 * @openapi
 * /targets/{targetId}/uptime-summary:
 *   get:
 *     summary: Get uptime summary for a specific target
 *     tags: [Targets]
 *     parameters:
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the target.
 *       - in: query
 *         name: periodHours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: The period in hours to calculate uptime for (e.g., 24 for last 24 hours).
 *     responses:
 *       200:
 *         description: Uptime summary for the target.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     targetId:
 *                       type: string
 *                     targetUrl:
 *                       type: string
 *                     targetName:
 *                       type: string
 *                     periodHours:
 *                       type: integer
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     uptimePercentage:
 *                       type: number
 *                       format: float
 *                     totalDowntimeSeconds:
 *                       type: number
 *                       format: float
 *                     events:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                             enum: [UP, DOWN]
 *       400:
 *         description: Invalid target ID format.
 *       404:
 *         description: Target not found.
 */
export const getTargetUptimeSummary = asyncHandler(async (req: Request, res: Response) => {
  const { targetId } = req.params;
  const periodHours = parseInt(req.query.periodHours as string, 10) || 24;

  if (!isValidObjectId(targetId)) {
    res.status(400).json({ success: false, message: 'Invalid target ID format' });
    return;
  }

  const target = await TargetModel.findById(targetId);
  if (!target) {
    res.status(404).json({ success: false, message: 'Target not found' });
    return;
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - periodHours * 60 * 60 * 1000);

  const alerts = await AlertModel.find({
    target: targetId,
    type: { $in: ['DOWNTIME', 'RECOVERY'] },
    triggeredAt: { $gte: startTime },
  }).sort({ triggeredAt: 'asc' });

  let totalDowntimeMs = 0;
  let lastDownTime: Date | null = null;

  alerts.forEach((alert: IAlert) => {
    if (alert.type === 'DOWNTIME' && alert.status === 'ACTIVE' && !lastDownTime) {
      lastDownTime = alert.triggeredAt > startTime ? alert.triggeredAt : startTime;
    } else if (alert.type === 'DOWNTIME' && alert.status === 'RESOLVED' && alert.resolvedAt) {
      const downStart = alert.triggeredAt > startTime ? alert.triggeredAt : startTime;
      const downEnd = alert.resolvedAt < now ? alert.resolvedAt : now;
      if (downEnd > downStart) {
        totalDowntimeMs += downEnd.getTime() - downStart.getTime();
      }
    } else if (alert.type === 'RECOVERY' && lastDownTime) {
      const recoveryTime = alert.triggeredAt < now ? alert.triggeredAt : now;
      if (lastDownTime && recoveryTime.getTime() > lastDownTime.getTime()) { // Ensure lastDownTime is not null
        totalDowntimeMs += recoveryTime.getTime() - lastDownTime.getTime();
      }
      lastDownTime = null;
    }
  });

  if (lastDownTime) { 
    // @ts-ignore - lastDownTime is a Date here due to the if condition, suppressing potential tsc issue
    totalDowntimeMs += now.getTime() - lastDownTime.getTime();
  }
  
  const actualPeriodStart = target.createdAt > startTime ? target.createdAt : startTime;
  const totalPeriodMs = now.getTime() - actualPeriodStart.getTime();

  if (totalPeriodMs <= 0) {
     res.status(200).json({
      success: true,
      data: { targetId, periodHours, uptimePercentage: 100, totalDowntimeSeconds: 0, events: [] }
    });
    return;
  }

  const uptimePercentage = Math.max(0, ((totalPeriodMs - totalDowntimeMs) / totalPeriodMs) * 100);
  const events: { timestamp: Date, status: 'UP' | 'DOWN' }[] = [];
  let lastPushedStatus: 'UP' | 'DOWN' | null = null;

  if (actualPeriodStart < now) {
    const initialDowntimeAlert = alerts.find((a: IAlert) => 
      a.type === 'DOWNTIME' && a.triggeredAt <= actualPeriodStart && (!a.resolvedAt || a.resolvedAt > actualPeriodStart)
    );
    const initialStatus = initialDowntimeAlert ? 'DOWN' : 'UP';
    events.push({ timestamp: actualPeriodStart, status: initialStatus });
    lastPushedStatus = initialStatus;
  }

  alerts.forEach((alert: IAlert) => {
    let eventTimeToConsider: Date | null = null;
    let statusToPush: 'UP' | 'DOWN' | null = null;

    if (alert.type === 'DOWNTIME' && alert.status !== 'RESOLVED') {
      eventTimeToConsider = alert.triggeredAt;
      statusToPush = 'DOWN';
    } else if (alert.type === 'RECOVERY') {
      eventTimeToConsider = alert.triggeredAt;
      statusToPush = 'UP';
    } else if (alert.type === 'DOWNTIME' && alert.status === 'RESOLVED' && alert.resolvedAt) {
      eventTimeToConsider = alert.resolvedAt;
      statusToPush = 'UP';
    }

    if (eventTimeToConsider && statusToPush && statusToPush !== lastPushedStatus) {
      let currentLastEventTimestamp = 0;
      const lastEventInListRef = events.length > 0 ? events[events.length - 1] : null;

      if (lastEventInListRef && lastEventInListRef.timestamp) {
        // @ts-ignore - Forcing through persistent 'never' type error on getTime()
        currentLastEventTimestamp = lastEventInListRef.timestamp.getTime(); 
      }

      if (eventTimeToConsider.getTime() > currentLastEventTimestamp) {
        events.push({ timestamp: eventTimeToConsider, status: statusToPush });
        lastPushedStatus = statusToPush;
      } else if (eventTimeToConsider.getTime() === currentLastEventTimestamp && lastEventInListRef) {
        if (lastEventInListRef.status !== statusToPush) {
           lastEventInListRef.status = statusToPush === 'DOWN' ? 'DOWN' : lastEventInListRef.status; 
           lastPushedStatus = lastEventInListRef.status;
        }
      }
    }
  });
  
  if (events.length > 0) {
    const lastEventInEvents = events[events.length - 1];
    if (lastEventInEvents.timestamp < now && (target.status === 'UP' || target.status === 'DOWN')) {
      if (lastEventInEvents.status !== target.status) {
        events.push({ timestamp: now, status: target.status });
      }
    }
  } else if ((target.status === 'UP' || target.status === 'DOWN') && actualPeriodStart < now ) {
    events.push({ timestamp: actualPeriodStart, status: target.status });
    if (actualPeriodStart.getTime() < now.getTime()) {
       if (events.length > 0) {
        const lastEventTimestamp = events[events.length - 1].timestamp;
        // @ts-ignore - Suppressing potential 'never' type error for getTime()
        if (lastEventTimestamp && lastEventTimestamp.getTime() < now.getTime()) {
            // @ts-ignore - Suppressing potential 'never' type error for status comparison
            if (events.length > 0 && events[events.length - 1].status !== target.status) {
                 events.push({ timestamp: now, status: target.status });
            // @ts-ignore - Suppressing potential 'never' type error for getTime()
            } else if (events.length === 1 && events[0].timestamp.getTime() < now.getTime()) { 
                 events.push({ timestamp: now, status: target.status });
            }
        }
       }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      targetId,
      targetUrl: target.url,
      targetName: target.name,
      periodHours,
      startTime: actualPeriodStart,
      endTime: now,
      uptimePercentage: parseFloat(uptimePercentage.toFixed(2)),
      totalDowntimeSeconds: parseFloat((totalDowntimeMs / 1000).toFixed(2)),
      events,
    },
  });
});
