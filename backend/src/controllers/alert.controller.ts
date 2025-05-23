import { Request, Response } from 'express';
import AlertModel, { IAlert } from '../models/alert.model';
import asyncHandler from '../utils/asyncHandler';
import { isValidObjectId } from 'mongoose';

// JSDoc comments were already added in a previous step.
// This is a placeholder to ensure the tool use format is correct if no changes are needed,
// or to re-apply if they were somehow lost.
// Assuming the JSDoc comments provided by the user in the previous turn are correct and complete for this file.

/**
 * @openapi
 * tags:
 *   name: Alerts
 *   description: API for managing and retrieving alerts
 */

/**
 * @openapi
 * /alerts:
 *   get:
 *     summary: Retrieve a list of alerts
 *     tags: [Alerts]
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
 *         description: Number of alerts per page.
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: string
 *         description: Filter alerts by target ID.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, ACKNOWLEDGED, RESOLVED]
 *         description: Filter alerts by status.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DOWNTIME, SSL_EXPIRY, DOMAIN_EXPIRY, RECOVERY]
 *         description: Filter alerts by type.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: triggeredAt
 *           enum: [triggeredAt, resolvedAt, createdAt, updatedAt]
 *         description: Field to sort by.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *         description: Sort order (ascending or descending).
 *     responses:
 *       200:
 *         description: A list of alerts.
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
 *                     $ref: '#/components/schemas/Alert'
 */
const getAllAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { 
    page = 1, 
    limit = 10, 
    targetId, 
    status, 
    type,
    sortBy = 'triggeredAt', // Default sort by triggeredAt
    sortOrder = 'desc' // Default descending (newest first)
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const query: any = {};
  if (targetId && isValidObjectId(targetId as string)) {
    query.target = targetId;
  }
  if (status && ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].includes((status as string).toUpperCase())) {
    query.status = (status as string).toUpperCase();
  }
  if (type && ['DOWNTIME', 'SSL_EXPIRY', 'DOMAIN_EXPIRY', 'RECOVERY'].includes((type as string).toUpperCase())) {
    query.type = (type as string).toUpperCase();
  }

  const sortOptions: any = {};
  if (['triggeredAt', 'resolvedAt', 'createdAt', 'updatedAt'].includes(sortBy as string)) {
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
  } else {
    sortOptions.triggeredAt = -1; // Default sort
  }
  
  const alerts = await AlertModel.find(query)
    .populate('target', 'name url') // Populate target name and URL
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  const totalAlerts = await AlertModel.countDocuments(query);

  res.status(200).json({
    success: true,
    count: alerts.length,
    totalPages: Math.ceil(totalAlerts / limitNum),
    currentPage: pageNum,
    data: alerts,
  });
});

/**
 * @openapi
 * /alerts/{id}:
 *   get:
 *     summary: Retrieve a single alert by its ID
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the alert to retrieve.
 *     responses:
 *       200:
 *         description: Detailed information about the alert.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         description: Invalid alert ID format.
 *       404:
 *         description: Alert not found.
 */
const getAlertById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid alert ID format' });
    return;
  }

  const alert = await AlertModel.findById(id).populate('target', 'name url');

  if (!alert) {
    res.status(404).json({ success: false, message: 'Alert not found' });
    return;
  }

  res.status(200).json({ success: true, data: alert });
});

/**
 * @openapi
 * /alerts/{id}/acknowledge:
 *   put:
 *     summary: Acknowledge an alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the alert to acknowledge.
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         description: Invalid alert ID format or alert already resolved.
 *       404:
 *         description: Alert not found.
 */
const acknowledgeAlert = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid alert ID format' });
    return;
  }

  const alert = await AlertModel.findById(id);

  if (!alert) {
    res.status(404).json({ success: false, message: 'Alert not found' });
    return;
  }

  if (alert.status === 'RESOLVED') {
    res.status(400).json({ success: false, message: 'Cannot acknowledge a resolved alert' });
    return;
  }
  
  alert.status = 'ACKNOWLEDGED';
  // Optionally, add acknowledgedBy user and timestamp if auth is implemented
  await alert.save();

  res.status(200).json({ success: true, data: alert });
});

// Note: Deleting alerts might be an admin function or a scheduled cleanup task,
// rather than a typical user-facing API endpoint. For now, we'll omit a DELETE endpoint.

/**
 * @openapi
 * /targets/{targetId}/alerts:
 *   get:
 *     summary: Retrieve alert history for a specific target
 *     tags: [Alerts, Targets] # Belongs to both conceptually
 *     parameters:
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the target to get alert history for.
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
 *         description: Number of alerts per page.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: triggeredAt
 *           enum: [triggeredAt, resolvedAt, createdAt, updatedAt]
 *         description: Field to sort by.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *         description: Sort order (ascending or descending).
 *     responses:
 *       200:
 *         description: A list of alerts for the specified target.
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
 *                     $ref: '#/components/schemas/Alert'
 *       400:
 *         description: Invalid target ID format.
 */
const getTargetAlertHistory = asyncHandler(async (req: Request, res: Response) => {
  const { targetId } = req.params;
  const { 
    page = 1, 
    limit = 10,
    sortBy = 'triggeredAt',
    sortOrder = 'desc'
  } = req.query;

  if (!isValidObjectId(targetId)) {
    res.status(400).json({ success: false, message: 'Invalid target ID format' });
    return;
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const query: any = { target: targetId };
  
  const sortOptions: any = {};
  if (['triggeredAt', 'resolvedAt', 'createdAt', 'updatedAt'].includes(sortBy as string)) {
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
  } else {
    sortOptions.triggeredAt = -1; // Default sort
  }

  const alerts = await AlertModel.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  const totalAlerts = await AlertModel.countDocuments(query);

  res.status(200).json({
    success: true,
    count: alerts.length,
    totalPages: Math.ceil(totalAlerts / limitNum),
    currentPage: pageNum,
    data: alerts,
  });
});


export {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
  getTargetAlertHistory,
};
