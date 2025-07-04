import dotenv from 'dotenv';
import logger from './pre-config-logger.js';
import convict from 'convict';

dotenv.config();

logger.debug('POSTGRES_URL from .env: %s', process.env.POSTGRES_URL);

// Define a comprehensive schema that includes all configuration parameters
const schema = {
  server: {
    port: {
      doc: 'Port the HTTP server listens on',
      format: 'port',
      default: 3000,
      env: 'PORT'
    },
    env: {
      doc: 'Application environment',
      format: ['development', 'production', 'test'],
      default: 'development',
      env: 'NODE_ENV'
    }
  },
  gemini: {
    apiKey: {
      doc: 'Gemini API key',
      format: String,
      default: '',
      env: 'GEMINI_API_KEY'
    },
    model: {
      doc: 'Default Gemini model',
      format: String,
      default: 'gemini-pro',
      env: 'GEMINI_MODEL'
    }
  },
  logging: {
    level: {
      doc: 'Log level',
      format: ['fatal','error','warn','info','debug','trace','silent'],
      default: 'debug',
      env: 'LOG_LEVEL'
    },
    centralizedLog: {
      doc: 'Enable centralized logging',
      format: Boolean,
      default: false,
      env: 'ENABLE_CENTRALIZED_LOG'
    }
  },
  stripe: {
    secretKey: {
      doc: 'Stripe secret key',
      format: String,
      default: '',
      env: 'STRIPE_SECRET_KEY'
    },
    apiKey: {
      doc: 'Stripe API key',
      format: String,
      default: '',
      env: 'STRIPE_API_KEY'
    },
    toolName: {
      doc: 'Stripe tool name',
      format: String,
      default: 'stripe-tool'
    }
  },
  github: {
    token: {
      doc: 'GitHub token',
      format: String,
      default: '',
      env: 'GITHUB_TOKEN'
    }
  },
  database: {
    url: {
      doc: 'Database URL',
      format: String,
      default: '',
      env: 'POSTGRES_URL'
    }
  },
  workflow: {
    concurrency: {
      doc: 'Workflow concurrency limit',
      format: 'nat',
      default: 5
    }
  },
  a2a: {
    enabled: {
      doc: 'Enable A2A protocol features',
      format: Boolean,
      default: true,
      env: 'A2A_ENABLED'
    },
    heartbeatInterval: {
      doc: 'Agent heartbeat interval in seconds',
      format: 'nat',
      default: 60,
      env: 'A2A_HEARTBEAT_INTERVAL'
    },
    agentTimeout: {
      doc: 'Time in seconds before an inactive agent is considered offline',
      format: 'nat',
      default: 180,
      env: 'A2A_AGENT_TIMEOUT'
    },
    taskCleanupInterval: {
      doc: 'Interval in seconds for cleaning up old tasks',
      format: 'nat',
      default: 3600,
      env: 'A2A_TASK_CLEANUP_INTERVAL'
    },
    matchThreshold: {
      doc: 'A2A match threshold',
      format: Number,
      default: 0.7
    }
  },
  security: {
    cors: {
      origin: {
        doc: 'CORS origin',
        format: String,
        default: '*'
      }
    },
    rateLimit: {
      standard: {
        windowMs: {
          doc: 'Standard rate limit window',
          format: 'nat',
          default: 900000
        },
        max: {
          doc: 'Standard rate limit max requests',
          format: 'nat',
          default: 100
        }
      },
      admin: {
        windowMs: {
          doc: 'Admin rate limit window',
          format: 'nat',
          default: 900000
        },
        max: {
          doc: 'Admin rate limit max requests',
          format: 'nat',
          default: 200
        }
      },
      execution: {
        windowMs: {
          doc: 'Execution rate limit window',
          format: 'nat',
          default: 900000
        },
        max: {
          doc: 'Execution rate limit max requests',
          format: 'nat',
          default: 50
        }
      }
    }
  },
  financialServices: {
    riskLimits: {
      maxPositionSize: {
        doc: 'Maximum position size',
        format: 'nat',
        default: 1000000,
        env: 'MAX_POSITION_SIZE'
      },
      maxDailyLoss: {
        doc: 'Maximum daily loss',
        format: 'nat',
        default: 50000,
        env: 'MAX_DAILY_LOSS'
      },
      maxDrawdown: {
        doc: 'Maximum drawdown',
        format: Number,
        default: 0.1,
        env: 'MAX_DRAWDOWN'
      },
      varLimit: {
        doc: 'VaR limit',
        format: 'nat',
        default: 100000,
        env: 'VAR_LIMIT'
      }
    },
    mcpServers: {
      financialCore: {
        port: {
          doc: 'Financial Core server port',
          format: 'port',
          default: 3010
        },
        name: {
          doc: 'Financial Core server name',
          format: String,
          default: 'Financial Core Server'
        },
        description: {
          doc: 'Financial Core server description',
          format: String,
          default: 'Core financial operations and account management'
        },
        capabilities: {
          doc: 'Financial Core server capabilities',
          format: Array,
          default: ['account_management', 'balance_inquiry', 'transaction_history']
        }
      },
      marketData: {
        port: {
          doc: 'Market Data server port',
          format: 'port',
          default: 3011
        },
        name: {
          doc: 'Market Data server name',
          format: String,
          default: 'Market Data Server'
        },
        description: {
          doc: 'Market Data server description',
          format: String,
          default: 'Real-time market data and analytics'
        },
        capabilities: {
          doc: 'Market Data server capabilities',
          format: Array,
          default: ['real_time_quotes', 'historical_data', 'market_analysis']
        }
      },
      tradingExecution: {
        port: {
          doc: 'Trading Execution server port',
          format: 'port',
          default: 3012
        },
        name: {
          doc: 'Trading Execution server name',
          format: String,
          default: 'Trading Execution Server'
        },
        description: {
          doc: 'Trading Execution server description',
          format: String,
          default: 'Order management and execution'
        },
        capabilities: {
          doc: 'Trading Execution server capabilities',
          format: Array,
          default: ['order_placement', 'order_management', 'execution_reports']
        }
      },
      riskManagement: {
        port: {
          doc: 'Risk Management server port',
          format: 'port',
          default: 3013
        },
        name: {
          doc: 'Risk Management server name',
          format: String,
          default: 'Risk Management Server'
        },
        description: {
          doc: 'Risk Management server description',
          format: String,
          default: 'Risk assessment and compliance monitoring'
        },
        capabilities: {
          doc: 'Risk Management server capabilities',
          format: Array,
          default: ['risk_calculation', 'compliance_check', 'exposure_monitoring']
        }
      },
      portfolioAnalytics: {
        port: {
          doc: 'Portfolio Analytics server port',
          format: 'port',
          default: 3014
        },
        name: {
          doc: 'Portfolio Analytics server name',
          format: String,
          default: 'Portfolio Analytics Server'
        },
        description: {
          doc: 'Portfolio Analytics server description',
          format: String,
          default: 'Portfolio performance and analytics'
        },
        capabilities: {
          doc: 'Portfolio Analytics server capabilities',
          format: Array,
          default: ['performance_analysis', 'attribution_analysis', 'portfolio_optimization']
        }
      },
      compliance: {
        port: {
          doc: 'Compliance server port',
          format: 'port',
          default: 3015
        },
        name: {
          doc: 'Compliance server name',
          format: String,
          default: 'Compliance Server'
        },
        description: {
          doc: 'Compliance server description',
          format: String,
          default: 'Regulatory compliance and reporting'
        },
        capabilities: {
          doc: 'Compliance server capabilities',
          format: Array,
          default: ['regulatory_reporting', 'audit_trails', 'compliance_monitoring']
        }
      }
    },
    agents: {
      portfolioManager: {
        id: {
          doc: 'Portfolio Manager agent ID',
          format: String,
          default: 'portfolio-manager-agent'
        },
        name: {
          doc: 'Portfolio Manager agent name',
          format: String,
          default: 'Portfolio Manager Agent'
        },
        specialization: {
          doc: 'Portfolio Manager agent specialization',
          format: String,
          default: 'portfolio_management'
        },
        capabilities: {
          doc: 'Portfolio Manager agent capabilities',
          format: Array,
          default: ['asset_allocation', 'rebalancing', 'performance_monitoring']
        },
        mcpServers: {
          doc: 'Portfolio Manager agent MCP servers',
          format: Array,
          default: ['financialCore', 'portfolioAnalytics', 'marketData']
        }
      },
      riskAnalyst: {
        id: {
          doc: 'Risk Analyst agent ID',
          format: String,
          default: 'risk-analyst-agent'
        },
        name: {
          doc: 'Risk Analyst agent name',
          format: String,
          default: 'Risk Analyst Agent'
        },
        specialization: {
          doc: 'Risk Analyst agent specialization',
          format: String,
          default: 'risk_management'
        },
        capabilities: {
          doc: 'Risk Analyst agent capabilities',
          format: Array,
          default: ['var_calculation', 'stress_testing', 'scenario_analysis']
        },
        mcpServers: {
          doc: 'Risk Analyst agent MCP servers',
          format: Array,
          default: ['riskManagement', 'marketData', 'portfolioAnalytics']
        }
      },
      tradingAgent: {
        id: {
          doc: 'Trading Agent ID',
          format: String,
          default: 'trading-agent'
        },
        name: {
          doc: 'Trading Agent name',
          format: String,
          default: 'Trading Agent'
        },
        specialization: {
          doc: 'Trading Agent specialization',
          format: String,
          default: 'trade_execution'
        },
        capabilities: {
          doc: 'Trading Agent capabilities',
          format: Array,
          default: ['order_routing', 'execution_optimization', 'market_making']
        },
        mcpServers: {
          doc: 'Trading Agent MCP servers',
          format: Array,
          default: ['tradingExecution', 'marketData', 'riskManagement']
        }
      },
      complianceOfficer: {
        id: {
          doc: 'Compliance Officer agent ID',
          format: String,
          default: 'compliance-officer-agent'
        },
        name: {
          doc: 'Compliance Officer agent name',
          format: String,
          default: 'Compliance Officer Agent'
        },
        specialization: {
          doc: 'Compliance Officer agent specialization',
          format: String,
          default: 'regulatory_compliance'
        },
        capabilities: {
          doc: 'Compliance Officer agent capabilities',
          format: Array,
          default: ['regulatory_monitoring', 'report_generation', 'audit_support']
        },
        mcpServers: {
          doc: 'Compliance Officer agent MCP servers',
          format: Array,
          default: ['compliance', 'financialCore', 'tradingExecution']
        }
      },
      clientAdvisor: {
        id: {
          doc: 'Client Advisor agent ID',
          format: String,
          default: 'client-advisor-agent'
        },
        name: {
          doc: 'Client Advisor agent name',
          format: String,
          default: 'Client Advisor Agent'
        },
        specialization: {
          doc: 'Client Advisor agent specialization',
          format: String,
          default: 'client_services'
        },
        capabilities: {
          doc: 'Client Advisor agent capabilities',
          format: Array,
          default: ['client_onboarding', 'advisory_services', 'relationship_management']
        },
        mcpServers: {
          doc: 'Client Advisor agent MCP servers',
          format: Array,
          default: ['financialCore', 'portfolioAnalytics', 'marketData']
        }
      }
    },
    integrations: {
      bloomberg: {
        apiKey: {
          doc: 'Bloomberg API key',
          format: String,
          default: '',
          env: 'BLOOMBERG_API_KEY'
        },
        baseUrl: {
          doc: 'Bloomberg base URL',
          format: String,
          default: 'https://api.bloomberg.com'
        },
        enabled: {
          doc: 'Bloomberg integration enabled',
          format: Boolean,
          default: false
        }
      },
      refinitiv: {
        apiKey: {
          doc: 'Refinitiv API key',
          format: String,
          default: '',
          env: 'REFINITIV_API_KEY'
        },
        baseUrl: {
          doc: 'Refinitiv base URL',
          format: String,
          default: 'https://api.refinitiv.com'
        },
        enabled: {
          doc: 'Refinitiv integration enabled',
          format: Boolean,
          default: false
        }
      },
      alphaVantage: {
        apiKey: {
          doc: 'Alpha Vantage API key',
          format: String,
          default: '',
          env: 'ALPHA_VANTAGE_API_KEY'
        },
        baseUrl: {
          doc: 'Alpha Vantage base URL',
          format: String,
          default: 'https://www.alphavantage.co'
        },
        enabled: {
          doc: 'Alpha Vantage integration enabled',
          format: Boolean,
          default: false
        }
      },
      fmp: {
        apiKey: {
          doc: 'FMP API key',
          format: String,
          default: '',
          env: 'FMP_API_KEY'
        },
        baseUrl: {
          doc: 'FMP base URL',
          format: String,
          default: 'https://financialmodelingprep.com/api'
        },
        enabled: {
          doc: 'FMP integration enabled',
          format: Boolean,
          default: false
        }
      },
      iex: {
        token: {
          doc: 'IEX token',
          format: String,
          default: '',
          env: 'IEX_TOKEN'
        },
        baseUrl: {
          doc: 'IEX base URL',
          format: String,
          default: 'https://cloud.iexapis.com'
        },
        enabled: {
          doc: 'IEX integration enabled',
          format: Boolean,
          default: false
        }
      }
    },
    brokers: {
      interactiveBrokers: {
        clientId: {
          doc: 'Interactive Brokers client ID',
          format: String,
          default: '',
          env: 'IB_CLIENT_ID'
        },
        gateway: {
          doc: 'Interactive Brokers gateway',
          format: String,
          default: 'localhost:7497',
          env: 'IB_GATEWAY'
        },
        enabled: {
          doc: 'Interactive Brokers integration enabled',
          format: Boolean,
          default: false
        }
      },
      alpaca: {
        apiKey: {
          doc: 'Alpaca API key',
          format: String,
          default: '',
          env: 'ALPACA_API_KEY'
        },
        secretKey: {
          doc: 'Alpaca secret key',
          format: String,
          default: '',
          env: 'ALPACA_SECRET_KEY'
        },
        baseUrl: {
          doc: 'Alpaca base URL',
          format: String,
          default: 'https://paper-api.alpaca.markets',
          env: 'ALPACA_BASE_URL'
        },
        enabled: {
          doc: 'Alpaca integration enabled',
          format: Boolean,
          default: false
        }
      },
      tdAmeritrade: {
        clientId: {
          doc: 'TD Ameritrade client ID',
          format: String,
          default: '',
          env: 'TD_CLIENT_ID'
        },
        refreshToken: {
          doc: 'TD Ameritrade refresh token',
          format: String,
          default: '',
          env: 'TD_REFRESH_TOKEN'
        },
        baseUrl: {
          doc: 'TD Ameritrade base URL',
          format: String,
          default: 'https://api.tdameritrade.com'
        },
        enabled: {
          doc: 'TD Ameritrade integration enabled',
          format: Boolean,
          default: false
        }
      }
    },
    compliance: {
      auditTrail: {
        enabled: {
          doc: 'Audit trail enabled',
          format: Boolean,
          default: true
        },
        retention: {
          doc: 'Audit trail retention days',
          format: 'nat',
          default: 2555,
          env: 'AUDIT_RETENTION_DAYS'
        },
        encryption: {
          doc: 'Audit trail encryption enabled',
          format: Boolean,
          default: true
        }
      },
      regulatoryReporting: {
        sec: {
          enabled: {
            doc: 'SEC reporting enabled',
            format: Boolean,
            default: false,
            env: 'SEC_REPORTING_ENABLED'
          },
          filingTypes: {
            doc: 'SEC filing types',
            format: Array,
            default: ['13F', '13D', '13G', 'ADV']
          }
        },
        finra: {
          enabled: {
            doc: 'FINRA reporting enabled',
            format: Boolean,
            default: false,
            env: 'FINRA_REPORTING_ENABLED'
          },
          reportTypes: {
            doc: 'FINRA report types',
            format: Array,
            default: ['OATS', 'CAT', 'TRACE']
          }
        },
        cftc: {
          enabled: {
            doc: 'CFTC reporting enabled',
            format: Boolean,
            default: false,
            env: 'CFTC_REPORTING_ENABLED'
          },
          reportTypes: {
            doc: 'CFTC report types',
            format: Array,
            default: ['EMIR', 'CFTC_PART43', 'CFTC_PART45']
          }
        }
      }
    }
  }
};

const cv = convict(schema);

// Load environment variables and validate against schema
try {
  cv.validate({ allowed: 'strict' });
} catch (err) {
  logger.error('Configuration validation error', err);
  process.exit(1);
}

// Get the validated configuration with additional legacy fields
const finalConfig = {
  ...cv.getProperties(),
  security: {
    helmet: {}, // Default helmet config
    ...cv.get('security'),
    maxRequestSize: '10mb',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  }
};

export default finalConfig;
