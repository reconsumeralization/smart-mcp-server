/**
 * Financial Core Tool Implementation
 * 
 * Provides comprehensive financial operations including:
 * - Portfolio management
 * - Account management
 * - Balance inquiries
 * - Transaction history
 * - Financial calculations
 */

import { logger } from '../logger.js';
import config from '../config.js';

// Mock financial data store - in production, this would connect to your financial database
class FinancialDataStore {
  constructor() {
    this.accounts = new Map();
    this.portfolios = new Map();
    this.transactions = new Map();
    this.positions = new Map();
    this.initializeMockData();
  }

  initializeMockData() {
    // Mock account data
    this.accounts.set('ACC001', {
      id: 'ACC001',
      name: 'John Doe Trading Account',
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
      cashBalance: 150000.00,
      buyingPower: 300000.00,
      marginUsed: 25000.00,
      dayTradingBuyingPower: 600000.00,
      currency: 'USD',
      createdDate: '2024-01-15',
      lastUpdated: new Date().toISOString()
    });

    // Mock portfolio positions
    this.positions.set('ACC001', [
      {
        symbol: 'AAPL',
        quantity: 100,
        averagePrice: 175.50,
        currentPrice: 182.30,
        marketValue: 18230.00,
        unrealizedPnL: 680.00,
        realizedPnL: 0.00,
        sector: 'Technology',
        assetClass: 'Equity'
      },
      {
        symbol: 'GOOGL',
        quantity: 50,
        averagePrice: 2650.00,
        currentPrice: 2720.50,
        marketValue: 136025.00,
        unrealizedPnL: 3525.00,
        realizedPnL: 0.00,
        sector: 'Technology',
        assetClass: 'Equity'
      },
      {
        symbol: 'SPY',
        quantity: 200,
        averagePrice: 420.00,
        currentPrice: 435.75,
        marketValue: 87150.00,
        unrealizedPnL: 3150.00,
        realizedPnL: 0.00,
        sector: 'Diversified',
        assetClass: 'ETF'
      }
    ]);

    // Mock transaction history
    this.transactions.set('ACC001', [
      {
        id: 'TXN001',
        date: '2024-01-20',
        type: 'BUY',
        symbol: 'AAPL',
        quantity: 100,
        price: 175.50,
        amount: 17550.00,
        fees: 1.00,
        status: 'SETTLED'
      },
      {
        id: 'TXN002',
        date: '2024-01-22',
        type: 'BUY',
        symbol: 'GOOGL',
        quantity: 50,
        price: 2650.00,
        amount: 132500.00,
        fees: 1.00,
        status: 'SETTLED'
      }
    ]);
  }

  getAccount(accountId) {
    return this.accounts.get(accountId);
  }

  getPortfolioPositions(accountId) {
    return this.positions.get(accountId) || [];
  }

  getTransactionHistory(accountId, startDate = null, endDate = null) {
    const transactions = this.transactions.get(accountId) || [];
    if (!startDate && !endDate) return transactions;
    
    return transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date();
      return txnDate >= start && txnDate <= end;
    });
  }
}

const financialStore = new FinancialDataStore();

/**
 * Get account information and balances
 * @param {object} params - Parameters
 * @param {string} params.account_id - Account identifier
 * @returns {Promise<object>} Account information
 */
export async function mcp_financial_get_account(params) {
  logger.info('Executing mcp_financial_get_account', { params });
  
  try {
    const { account_id } = params;
    
    if (!account_id) {
      throw new Error('Account ID is required');
    }

    const account = financialStore.getAccount(account_id);
    
    if (!account) {
      throw new Error(`Account ${account_id} not found`);
    }

    return {
      success: true,
      account: account
    };
  } catch (error) {
    logger.error('mcp_financial_get_account failed', { error: error.message });
    throw new Error(`Financial Core Error: ${error.message}`);
  }
}

/**
 * Get portfolio positions for an account
 * @param {object} params - Parameters
 * @param {string} params.account_id - Account identifier
 * @returns {Promise<object>} Portfolio positions
 */
export async function mcp_financial_get_portfolio(params) {
  logger.info('Executing mcp_financial_get_portfolio', { params });
  
  try {
    const { account_id } = params;
    
    if (!account_id) {
      throw new Error('Account ID is required');
    }

    const positions = financialStore.getPortfolioPositions(account_id);
    const account = financialStore.getAccount(account_id);
    
    if (!account) {
      throw new Error(`Account ${account_id} not found`);
    }

    // Calculate portfolio metrics
    const totalMarketValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const totalValue = totalMarketValue + account.cashBalance;

    // Asset allocation
    const assetAllocation = positions.reduce((allocation, pos) => {
      const percentage = (pos.marketValue / totalMarketValue) * 100;
      allocation[pos.symbol] = {
        marketValue: pos.marketValue,
        percentage: percentage.toFixed(2)
      };
      return allocation;
    }, {});

    // Sector allocation
    const sectorAllocation = positions.reduce((allocation, pos) => {
      if (!allocation[pos.sector]) {
        allocation[pos.sector] = { marketValue: 0, percentage: 0 };
      }
      allocation[pos.sector].marketValue += pos.marketValue;
      return allocation;
    }, {});

    // Calculate sector percentages
    Object.keys(sectorAllocation).forEach(sector => {
      sectorAllocation[sector].percentage = 
        ((sectorAllocation[sector].marketValue / totalMarketValue) * 100).toFixed(2);
    });

    return {
      success: true,
      portfolio: {
        accountId: account_id,
        positions: positions,
        summary: {
          totalMarketValue: totalMarketValue,
          cashBalance: account.cashBalance,
          totalValue: totalValue,
          totalUnrealizedPnL: totalUnrealizedPnL,
          dayChange: totalUnrealizedPnL, // Simplified for demo
          dayChangePercent: ((totalUnrealizedPnL / (totalMarketValue - totalUnrealizedPnL)) * 100).toFixed(2)
        },
        allocation: {
          byAsset: assetAllocation,
          bySector: sectorAllocation
        }
      }
    };
  } catch (error) {
    logger.error('mcp_financial_get_portfolio failed', { error: error.message });
    throw new Error(`Financial Core Error: ${error.message}`);
  }
}

/**
 * Get transaction history for an account
 * @param {object} params - Parameters
 * @param {string} params.account_id - Account identifier
 * @param {string} [params.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [params.end_date] - End date (YYYY-MM-DD)
 * @param {string} [params.transaction_type] - Filter by transaction type
 * @returns {Promise<object>} Transaction history
 */
export async function mcp_financial_get_transactions(params) {
  logger.info('Executing mcp_financial_get_transactions', { params });
  
  try {
    const { account_id, start_date, end_date, transaction_type } = params;
    
    if (!account_id) {
      throw new Error('Account ID is required');
    }

    let transactions = financialStore.getTransactionHistory(account_id, start_date, end_date);
    
    // Filter by transaction type if specified
    if (transaction_type) {
      transactions = transactions.filter(txn => 
        txn.type.toLowerCase() === transaction_type.toLowerCase()
      );
    }

    // Calculate summary statistics
    const totalValue = transactions.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
    const totalFees = transactions.reduce((sum, txn) => sum + txn.fees, 0);
    const buyTransactions = transactions.filter(txn => txn.type === 'BUY').length;
    const sellTransactions = transactions.filter(txn => txn.type === 'SELL').length;

    return {
      success: true,
      transactions: {
        data: transactions,
        summary: {
          totalTransactions: transactions.length,
          totalValue: totalValue,
          totalFees: totalFees,
          buyCount: buyTransactions,
          sellCount: sellTransactions,
          dateRange: {
            start: start_date || 'All time',
            end: end_date || 'Present'
          }
        }
      }
    };
  } catch (error) {
    logger.error('mcp_financial_get_transactions failed', { error: error.message });
    throw new Error(`Financial Core Error: ${error.message}`);
  }
}

/**
 * Calculate portfolio performance metrics
 * @param {object} params - Parameters
 * @param {string} params.account_id - Account identifier
 * @param {string} [params.period] - Performance period (1D, 1W, 1M, 3M, 6M, 1Y)
 * @returns {Promise<object>} Performance metrics
 */
export async function mcp_financial_calculate_performance(params) {
  logger.info('Executing mcp_financial_calculate_performance', { params });
  
  try {
    const { account_id, period = '1M' } = params;
    
    if (!account_id) {
      throw new Error('Account ID is required');
    }

    const account = financialStore.getAccount(account_id);
    const positions = financialStore.getPortfolioPositions(account_id);
    
    if (!account) {
      throw new Error(`Account ${account_id} not found`);
    }

    const totalMarketValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const totalValue = totalMarketValue + account.cashBalance;

    // Mock performance calculations (in production, use historical data)
    const performanceMetrics = {
      period: period,
      totalReturn: totalUnrealizedPnL,
      totalReturnPercent: ((totalUnrealizedPnL / (totalMarketValue - totalUnrealizedPnL)) * 100).toFixed(2),
      annualizedReturn: (Math.random() * 15 + 5).toFixed(2), // Mock data
      volatility: (Math.random() * 20 + 10).toFixed(2), // Mock data
      sharpeRatio: (Math.random() * 2 + 0.5).toFixed(2), // Mock data
      maxDrawdown: (Math.random() * -10 - 2).toFixed(2), // Mock data
      beta: (Math.random() * 0.5 + 0.8).toFixed(2), // Mock data
      alpha: (Math.random() * 5 - 2.5).toFixed(2), // Mock data
      benchmarkReturn: (Math.random() * 12 + 3).toFixed(2), // Mock data
      trackingError: (Math.random() * 5 + 1).toFixed(2) // Mock data
    };

    return {
      success: true,
      performance: {
        accountId: account_id,
        asOfDate: new Date().toISOString(),
        metrics: performanceMetrics,
        attribution: {
          assetAllocation: (Math.random() * 3 - 1.5).toFixed(2),
          stockSelection: (Math.random() * 2 - 1).toFixed(2),
          interaction: (Math.random() * 0.5 - 0.25).toFixed(2)
        }
      }
    };
  } catch (error) {
    logger.error('mcp_financial_calculate_performance failed', { error: error.message });
    throw new Error(`Financial Core Error: ${error.message}`);
  }
}

/**
 * Get account balance and buying power
 * @param {object} params - Parameters
 * @param {string} params.account_id - Account identifier
 * @returns {Promise<object>} Balance information
 */
export async function mcp_financial_get_balance(params) {
  logger.info('Executing mcp_financial_get_balance', { params });
  
  try {
    const { account_id } = params;
    
    if (!account_id) {
      throw new Error('Account ID is required');
    }

    const account = financialStore.getAccount(account_id);
    
    if (!account) {
      throw new Error(`Account ${account_id} not found`);
    }

    return {
      success: true,
      balance: {
        accountId: account_id,
        cashBalance: account.cashBalance,
        buyingPower: account.buyingPower,
        marginUsed: account.marginUsed,
        dayTradingBuyingPower: account.dayTradingBuyingPower,
        currency: account.currency,
        asOfDate: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('mcp_financial_get_balance failed', { error: error.message });
    throw new Error(`Financial Core Error: ${error.message}`);
  }
}

/**
 * Calculate risk metrics for a portfolio
 * @param {object} params - Parameters
 * @param {string} params.account_id - Account identifier
 * @param {number} [params.confidence_level] - VaR confidence level (default: 0.95)
 * @returns {Promise<object>} Risk metrics
 */
export async function mcp_financial_calculate_risk(params) {
  logger.info('Executing mcp_financial_calculate_risk', { params });
  
  try {
    const { account_id, confidence_level = 0.95 } = params;
    
    if (!account_id) {
      throw new Error('Account ID is required');
    }

    const account = financialStore.getAccount(account_id);
    const positions = financialStore.getPortfolioPositions(account_id);
    
    if (!account) {
      throw new Error(`Account ${account_id} not found`);
    }

    const totalMarketValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    // Mock risk calculations (in production, use actual volatility and correlation data)
    const riskMetrics = {
      valueAtRisk: {
        oneDay: (totalMarketValue * 0.02 * Math.random() + 0.01).toFixed(2),
        tenDay: (totalMarketValue * 0.06 * Math.random() + 0.03).toFixed(2),
        confidenceLevel: confidence_level
      },
      expectedShortfall: {
        oneDay: (totalMarketValue * 0.025 * Math.random() + 0.015).toFixed(2),
        tenDay: (totalMarketValue * 0.08 * Math.random() + 0.04).toFixed(2)
      },
      portfolioVolatility: (Math.random() * 20 + 10).toFixed(2),
      concentrationRisk: {
        largestPosition: Math.max(...positions.map(p => (p.marketValue / totalMarketValue) * 100)).toFixed(2),
        top3Concentration: positions
          .sort((a, b) => b.marketValue - a.marketValue)
          .slice(0, 3)
          .reduce((sum, pos) => sum + (pos.marketValue / totalMarketValue) * 100, 0)
          .toFixed(2)
      },
      sectorConcentration: positions.reduce((sectors, pos) => {
        const pct = (pos.marketValue / totalMarketValue) * 100;
        sectors[pos.sector] = (sectors[pos.sector] || 0) + pct;
        return sectors;
      }, {})
    };

    return {
      success: true,
      risk: {
        accountId: account_id,
        asOfDate: new Date().toISOString(),
        totalPortfolioValue: totalMarketValue,
        metrics: riskMetrics
      }
    };
  } catch (error) {
    logger.error('mcp_financial_calculate_risk failed', { error: error.message });
    throw new Error(`Financial Core Error: ${error.message}`);
  }
}

export default {
  mcp_financial_get_account,
  mcp_financial_get_portfolio,
  mcp_financial_get_transactions,
  mcp_financial_calculate_performance,
  mcp_financial_get_balance,
  mcp_financial_calculate_risk
}; 