/**
 * Trading Execution Tool Implementation
 * 
 * Provides comprehensive trading capabilities including:
 * - Order placement and management
 * - Trade execution simulation
 * - Order book management
 * - Execution reports
 * - Trade blotter
 */

import logger from '../logger.js';
import config from '../config.js';
import { v4 as uuidv4 } from 'uuid';

// Mock trading system - in production, integrate with actual brokers/exchanges
class TradingSystem {
  constructor() {
    this.orders = new Map();
    this.trades = new Map();
    this.positions = new Map();
    this.orderBook = new Map();
    this.initializeMockData();
  }

  initializeMockData() {
    // Initialize mock order book data
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
    
    symbols.forEach(symbol => {
      const basePrice = Math.random() * 300 + 50;
      this.orderBook.set(symbol, {
        symbol: symbol,
        bids: Array.from({ length: 10 }, (_, i) => ({
          price: (basePrice - (i + 1) * 0.01).toFixed(2),
          size: Math.floor(Math.random() * 1000) + 100,
          orders: Math.floor(Math.random() * 5) + 1
        })),
        asks: Array.from({ length: 10 }, (_, i) => ({
          price: (basePrice + (i + 1) * 0.01).toFixed(2),
          size: Math.floor(Math.random() * 1000) + 100,
          orders: Math.floor(Math.random() * 5) + 1
        })),
        lastUpdate: new Date().toISOString()
      });
    });
  }

  generateOrderId() {
    return `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTradeId() {
    return `TRD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateOrder(order) {
    const required = ['symbol', 'side', 'quantity', 'orderType'];
    for (const field of required) {
      if (!order[field]) {
        throw new Error(`${field} is required`);
      }
    }

    if (!['BUY', 'SELL'].includes(order.side.toUpperCase())) {
      throw new Error('Side must be BUY or SELL');
    }

    if (!['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'].includes(order.orderType.toUpperCase())) {
      throw new Error('Invalid order type');
    }

    if (order.quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (['LIMIT', 'STOP_LIMIT'].includes(order.orderType.toUpperCase()) && !order.price) {
      throw new Error('Price is required for limit orders');
    }

    if (['STOP', 'STOP_LIMIT'].includes(order.orderType.toUpperCase()) && !order.stopPrice) {
      throw new Error('Stop price is required for stop orders');
    }
  }

  placeOrder(orderRequest) {
    this.validateOrder(orderRequest);

    const orderId = this.generateOrderId();
    const order = {
      orderId: orderId,
      symbol: orderRequest.symbol.toUpperCase(),
      side: orderRequest.side.toUpperCase(),
      quantity: orderRequest.quantity,
      orderType: orderRequest.orderType.toUpperCase(),
      price: orderRequest.price || null,
      stopPrice: orderRequest.stopPrice || null,
      timeInForce: orderRequest.timeInForce || 'DAY',
      accountId: orderRequest.accountId || 'ACC001',
      status: 'PENDING_NEW',
      filledQuantity: 0,
      remainingQuantity: orderRequest.quantity,
      avgFillPrice: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fills: []
    };

    this.orders.set(orderId, order);

    // Simulate order processing
    setTimeout(() => {
      this.processOrder(orderId);
    }, Math.random() * 2000 + 500);

    return order;
  }

  processOrder(orderId) {
    const order = this.orders.get(orderId);
    if (!order) return;

    // Simulate order execution
    const orderBook = this.orderBook.get(order.symbol);
    if (!orderBook) {
      order.status = 'REJECTED';
      order.rejectReason = 'Symbol not found';
      order.updatedAt = new Date().toISOString();
      return;
    }

    order.status = 'NEW';
    order.updatedAt = new Date().toISOString();

    // Simulate fills for market orders
    if (order.orderType === 'MARKET') {
      this.simulateFill(order);
    } else if (order.orderType === 'LIMIT') {
      // For demo, randomly fill limit orders
      if (Math.random() > 0.3) {
        setTimeout(() => this.simulateFill(order), Math.random() * 5000 + 1000);
      }
    }
  }

  simulateFill(order) {
    if (order.status === 'FILLED' || order.status === 'CANCELLED') return;

    const orderBook = this.orderBook.get(order.symbol);
    const marketSide = order.side === 'BUY' ? orderBook.asks : orderBook.bids;
    
    if (marketSide.length === 0) return;

    // Simulate partial or full fill
    const fillQuantity = Math.min(
      order.remainingQuantity,
      Math.floor(Math.random() * order.remainingQuantity) + 1
    );
    
    const fillPrice = order.orderType === 'MARKET' 
      ? parseFloat(marketSide[0].price)
      : order.price;

    const fill = {
      fillId: this.generateTradeId(),
      quantity: fillQuantity,
      price: fillPrice,
      timestamp: new Date().toISOString(),
      commission: fillQuantity * fillPrice * 0.0001 // 0.01% commission
    };

    order.fills.push(fill);
    order.filledQuantity += fillQuantity;
    order.remainingQuantity -= fillQuantity;
    
    // Calculate average fill price
    const totalValue = order.fills.reduce((sum, f) => sum + (f.quantity * f.price), 0);
    order.avgFillPrice = totalValue / order.filledQuantity;

    if (order.remainingQuantity === 0) {
      order.status = 'FILLED';
    } else {
      order.status = 'PARTIALLY_FILLED';
    }

    order.updatedAt = new Date().toISOString();

    // Create trade record
    const trade = {
      tradeId: fill.fillId,
      orderId: order.orderId,
      symbol: order.symbol,
      side: order.side,
      quantity: fillQuantity,
      price: fillPrice,
      value: fillQuantity * fillPrice,
      commission: fill.commission,
      accountId: order.accountId,
      timestamp: fill.timestamp
    };

    this.trades.set(fill.fillId, trade);

    logger.info(`Order ${order.orderId} filled: ${fillQuantity} shares at $${fillPrice}`);
  }

  cancelOrder(orderId) {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (['FILLED', 'CANCELLED', 'REJECTED'].includes(order.status)) {
      throw new Error(`Cannot cancel order in ${order.status} status`);
    }

    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();

    return order;
  }

  getOrder(orderId) {
    return this.orders.get(orderId);
  }

  getOrdersByAccount(accountId) {
    return Array.from(this.orders.values()).filter(order => order.accountId === accountId);
  }

  getTrades(accountId, startDate = null, endDate = null) {
    let trades = Array.from(this.trades.values());
    
    if (accountId) {
      trades = trades.filter(trade => trade.accountId === accountId);
    }

    if (startDate || endDate) {
      trades = trades.filter(trade => {
        const tradeDate = new Date(trade.timestamp);
        const start = startDate ? new Date(startDate) : new Date('1900-01-01');
        const end = endDate ? new Date(endDate) : new Date();
        return tradeDate >= start && tradeDate <= end;
      });
    }

    return trades;
  }

  getOrderBook(symbol) {
    return this.orderBook.get(symbol.toUpperCase());
  }
}

const tradingSystem = new TradingSystem();

/**
 * Place a new order
 * @param {object} params - Order parameters
 * @param {string} params.symbol - Stock symbol
 * @param {string} params.side - BUY or SELL
 * @param {number} params.quantity - Number of shares
 * @param {string} params.orderType - MARKET, LIMIT, STOP, STOP_LIMIT
 * @param {number} [params.price] - Limit price (required for LIMIT and STOP_LIMIT)
 * @param {number} [params.stopPrice] - Stop price (required for STOP and STOP_LIMIT)
 * @param {string} [params.timeInForce] - DAY, GTC, IOC, FOK
 * @param {string} [params.accountId] - Account identifier
 * @returns {Promise<object>} Order confirmation
 */
export async function mcp_trading_place_order(params) {
  logger.info('Executing mcp_trading_place_order', { params });
  
  try {
    const order = tradingSystem.placeOrder(params);
    
    return {
      success: true,
      order: order
    };
  } catch (error) {
    logger.error('mcp_trading_place_order failed', { error: error.message });
    throw new Error(`Trading Error: ${error.message}`);
  }
}

/**
 * Cancel an existing order
 * @param {object} params - Parameters
 * @param {string} params.orderId - Order identifier
 * @returns {Promise<object>} Cancellation confirmation
 */
export async function mcp_trading_cancel_order(params) {
  logger.info('Executing mcp_trading_cancel_order', { params });
  
  try {
    const { orderId } = params;
    
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const order = tradingSystem.cancelOrder(orderId);
    
    return {
      success: true,
      order: order
    };
  } catch (error) {
    logger.error('mcp_trading_cancel_order failed', { error: error.message });
    throw new Error(`Trading Error: ${error.message}`);
  }
}

/**
 * Get order status and details
 * @param {object} params - Parameters
 * @param {string} params.orderId - Order identifier
 * @returns {Promise<object>} Order details
 */
export async function mcp_trading_get_order(params) {
  logger.info('Executing mcp_trading_get_order', { params });
  
  try {
    const { orderId } = params;
    
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const order = tradingSystem.getOrder(orderId);
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return {
      success: true,
      order: order
    };
  } catch (error) {
    logger.error('mcp_trading_get_order failed', { error: error.message });
    throw new Error(`Trading Error: ${error.message}`);
  }
}

/**
 * Get all orders for an account
 * @param {object} params - Parameters
 * @param {string} params.accountId - Account identifier
 * @param {string} [params.status] - Filter by order status
 * @param {string} [params.symbol] - Filter by symbol
 * @returns {Promise<object>} List of orders
 */
export async function mcp_trading_get_orders(params) {
  logger.info('Executing mcp_trading_get_orders', { params });
  
  try {
    const { accountId, status, symbol } = params;
    
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    let orders = tradingSystem.getOrdersByAccount(accountId);
    
    // Apply filters
    if (status) {
      orders = orders.filter(order => order.status === status.toUpperCase());
    }
    
    if (symbol) {
      orders = orders.filter(order => order.symbol === symbol.toUpperCase());
    }

    // Sort by creation time (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      success: true,
      orders: orders,
      count: orders.length
    };
  } catch (error) {
    logger.error('mcp_trading_get_orders failed', { error: error.message });
    throw new Error(`Trading Error: ${error.message}`);
  }
}

/**
 * Get trade history
 * @param {object} params - Parameters
 * @param {string} params.accountId - Account identifier
 * @param {string} [params.startDate] - Start date (YYYY-MM-DD)
 * @param {string} [params.endDate] - End date (YYYY-MM-DD)
 * @param {string} [params.symbol] - Filter by symbol
 * @returns {Promise<object>} Trade history
 */
export async function mcp_trading_get_trades(params) {
  logger.info('Executing mcp_trading_get_trades', { params });
  
  try {
    const { accountId, startDate, endDate, symbol } = params;
    
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    let trades = tradingSystem.getTrades(accountId, startDate, endDate);
    
    // Apply symbol filter
    if (symbol) {
      trades = trades.filter(trade => trade.symbol === symbol.toUpperCase());
    }

    // Sort by timestamp (newest first)
    trades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Calculate summary statistics
    const summary = {
      totalTrades: trades.length,
      totalValue: trades.reduce((sum, trade) => sum + trade.value, 0),
      totalCommissions: trades.reduce((sum, trade) => sum + trade.commission, 0),
      buyTrades: trades.filter(trade => trade.side === 'BUY').length,
      sellTrades: trades.filter(trade => trade.side === 'SELL').length,
      uniqueSymbols: [...new Set(trades.map(trade => trade.symbol))].length
    };

    return {
      success: true,
      trades: trades,
      summary: summary
    };
  } catch (error) {
    logger.error('mcp_trading_get_trades failed', { error: error.message });
    throw new Error(`Trading Error: ${error.message}`);
  }
}

/**
 * Get order book (market depth) for a symbol
 * @param {object} params - Parameters
 * @param {string} params.symbol - Stock symbol
 * @param {number} [params.depth] - Number of levels to return (default: 10)
 * @returns {Promise<object>} Order book data
 */
export async function mcp_trading_get_order_book(params) {
  logger.info('Executing mcp_trading_get_order_book', { params });
  
  try {
    const { symbol, depth = 10 } = params;
    
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const orderBook = tradingSystem.getOrderBook(symbol);
    
    if (!orderBook) {
      throw new Error(`Order book not available for symbol: ${symbol}`);
    }

    // Limit depth
    const limitedOrderBook = {
      symbol: orderBook.symbol,
      bids: orderBook.bids.slice(0, depth),
      asks: orderBook.asks.slice(0, depth),
      lastUpdate: orderBook.lastUpdate
    };

    // Calculate spread and market depth
    const bestBid = parseFloat(limitedOrderBook.bids[0]?.price || 0);
    const bestAsk = parseFloat(limitedOrderBook.asks[0]?.price || 0);
    const spread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? (spread / bestBid * 100).toFixed(4) : 0;

    const bidVolume = limitedOrderBook.bids.reduce((sum, level) => sum + level.size, 0);
    const askVolume = limitedOrderBook.asks.reduce((sum, level) => sum + level.size, 0);

    return {
      success: true,
      orderBook: limitedOrderBook,
      marketData: {
        bestBid: bestBid,
        bestAsk: bestAsk,
        spread: spread.toFixed(4),
        spreadPercent: spreadPercent,
        bidVolume: bidVolume,
        askVolume: askVolume,
        imbalance: ((bidVolume - askVolume) / (bidVolume + askVolume) * 100).toFixed(2)
      }
    };
  } catch (error) {
    logger.error('mcp_trading_get_order_book failed', { error: error.message });
    throw new Error(`Trading Error: ${error.message}`);
  }
}

/**
 * Get execution report for a specific time period
 * @param {object} params - Parameters
 * @param {string} params.accountId - Account identifier
 * @param {string} [params.startDate] - Start date (YYYY-MM-DD)
 * @param {string} [params.endDate] - End date (YYYY-MM-DD)
 * @returns {Promise<object>} Execution report
 */
export async function mcp_trading_execution_report(params) {
  logger.info('Executing mcp_trading_execution_report', { params });
  
  try {
    const { accountId, startDate, endDate } = params;
    
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    const orders = tradingSystem.getOrdersByAccount(accountId);
    const trades = tradingSystem.getTrades(accountId, startDate, endDate);

    // Filter orders by date if specified
    let filteredOrders = orders;
    if (startDate || endDate) {
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const start = startDate ? new Date(startDate) : new Date('1900-01-01');
        const end = endDate ? new Date(endDate) : new Date();
        return orderDate >= start && orderDate <= end;
      });
    }

    // Calculate execution statistics
    const executionStats = {
      totalOrders: filteredOrders.length,
      filledOrders: filteredOrders.filter(o => o.status === 'FILLED').length,
      partiallyFilledOrders: filteredOrders.filter(o => o.status === 'PARTIALLY_FILLED').length,
      cancelledOrders: filteredOrders.filter(o => o.status === 'CANCELLED').length,
      rejectedOrders: filteredOrders.filter(o => o.status === 'REJECTED').length,
      fillRate: 0,
      avgFillTime: 0
    };

    executionStats.fillRate = executionStats.totalOrders > 0 
      ? ((executionStats.filledOrders / executionStats.totalOrders) * 100).toFixed(2)
      : 0;

    // Calculate average fill time for filled orders
    const filledOrders = filteredOrders.filter(o => o.status === 'FILLED');
    if (filledOrders.length > 0) {
      const totalFillTime = filledOrders.reduce((sum, order) => {
        const created = new Date(order.createdAt);
        const updated = new Date(order.updatedAt);
        return sum + (updated - created);
      }, 0);
      executionStats.avgFillTime = Math.round(totalFillTime / filledOrders.length / 1000); // in seconds
    }

    // Order type breakdown
    const orderTypeBreakdown = filteredOrders.reduce((breakdown, order) => {
      breakdown[order.orderType] = (breakdown[order.orderType] || 0) + 1;
      return breakdown;
    }, {});

    // Side breakdown
    const sideBreakdown = filteredOrders.reduce((breakdown, order) => {
      breakdown[order.side] = (breakdown[order.side] || 0) + 1;
      return breakdown;
    }, {});

    return {
      success: true,
      executionReport: {
        accountId: accountId,
        reportPeriod: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present'
        },
        statistics: executionStats,
        breakdown: {
          orderTypes: orderTypeBreakdown,
          sides: sideBreakdown
        },
        orders: filteredOrders,
        trades: trades
      }
    };
  } catch (error) {
    logger.error('mcp_trading_execution_report failed', { error: error.message });
    throw new Error(`Trading Error: ${error.message}`);
  }
}

export default {
  mcp_trading_place_order,
  mcp_trading_cancel_order,
  mcp_trading_get_order,
  mcp_trading_get_orders,
  mcp_trading_get_trades,
  mcp_trading_get_order_book,
  mcp_trading_execution_report
}; 