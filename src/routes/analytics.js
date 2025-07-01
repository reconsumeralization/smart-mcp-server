import express from 'express';
import AnalyticsService from '../services/AnalyticsService.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All analytics routes require authentication
router.use(auth.authenticate);

// GET /api/analytics/summary
// Provides a high-level summary for admin dashboards
router.get('/summary', auth.authorize(['admin']), async (req, res, next) => {
  try {
    const summary = await AnalyticsService.getDashboardSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/financial
// Provides detailed financial analytics
router.get('/financial', auth.authorize(['admin', 'viewer']), async (req, res, next) => {
  try {
    const financialData = await AnalyticsService.getFinancialAnalytics();
    res.json(financialData);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/system
// Provides system performance metrics
router.get('/system', auth.authorize(['admin']), async (req, res, next) => {
  try {
    const systemData = await AnalyticsService.getSystemAnalytics();
    res.json(systemData);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/workflow
// Provides analytics on workflow execution
router.get('/workflow', auth.authorize(['admin', 'viewer']), async (req, res, next) => {
  try {
    const workflowData = await AnalyticsService.getWorkflowAnalytics();
    res.json(workflowData);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/user
// Provides analytics on user activity
router.get('/user', auth.authorize(['admin']), async (req, res, next) => {
  try {
    const userData = await AnalyticsService.getUserAnalytics();
    res.json(userData);
  } catch (error) {
    next(error);
  }
});

export default router; 