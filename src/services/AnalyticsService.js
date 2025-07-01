import mongoose from 'mongoose';
import User from '../models/User.js';
// The following models are required for full functionality.
// Their absence is why parts of this service return mock data.
// import Transaction from '../models/Transaction.js';
// import WorkflowExecution from '../models/WorkflowExecution.js';
// import ApiLog from '../models/ApiLog.js';

class AnalyticsService {
  /**
   * Provides a high-level summary for admin dashboards.
   */
  static async getDashboardSummary() {
    // This method will provide a true summary once all models are available.
    const userAnalytics = await this.getUserAnalytics();
    const financialAnalytics = await this.getFinancialAnalytics();
    const workflowAnalytics = await this.getWorkflowAnalytics();

    return {
      userSummary: {
        totalUsers: userAnalytics.totalUsers,
        activeUsersLast30Days: userAnalytics.activeUsersLast30Days,
      },
      financialSummary: {
        totalRevenue: financialAnalytics.totalRevenue,
        transactionCount: financialAnalytics.transactionCount,
      },
      workflowSummary: {
        totalExecuted: workflowAnalytics.totalExecuted,
        successRate: workflowAnalytics.successRate,
      }
    };
  }

  /**
   * Retrieves financial analytics from the database.
   */
  static async getFinancialAnalytics() {
    // MOCKED: Requires 'Transaction' model.
    /*
    const data = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);
    return data[0] || { totalRevenue: 0, transactionCount: 0 };
    */
    return { totalRevenue: 150000, transactionCount: 450, comment: "MOCKED DATA" };
  }

  /**
   * Retrieves system performance analytics.
   */
  static async getSystemAnalytics() {
    // MOCKED: Requires 'ApiLog' model.
    return {
      averageResponseTime: 120,
      errorRate: 1.5,
      uptime: 99.9,
      comment: "MOCKED DATA"
    };
  }

  /**
   * Retrieves workflow analytics from the database.
   */
  static async getWorkflowAnalytics() {
    // MOCKED: Requires 'WorkflowExecution' model.
    return {
      totalExecuted: 1300,
      successRate: 95.5,
      comment: "MOCKED DATA"
    };
  }

  /**
   * Retrieves user activity analytics from the database.
   */
  static async getUserAnalytics() {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsersLast30Days = await User.countDocuments({
        // Assuming a 'lastLogin' field exists on the User model
        lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      });
      const geographicDistribution = await User.aggregate([
        // Assuming a 'country' field exists
        { $match: { country: { $exists: true, $ne: null } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        totalUsers,
        activeUsersLast30Days,
        geographicDistribution,
      };
    } catch (error) {
      console.error("Error in getUserAnalytics:", error);
      return { totalUsers: 0, activeUsersLast30Days: 0, geographicDistribution: [] };
    }
  }
}

export default AnalyticsService;