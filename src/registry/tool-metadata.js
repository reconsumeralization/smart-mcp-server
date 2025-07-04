export const toolMetadata = [
  {
    toolId: 'mcp_stripe_router',
    name: 'Stripe Router',
    description: 'Routes Stripe-related operations to the appropriate sub-agents.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'The Stripe action to perform (e.g., create_customer, process_payment).' },
        data: { type: 'object', description: 'Payload for the Stripe action.' }
      },
      required: ['action', 'data']
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
        result: { type: 'object' }
      }
    },
    category: 'Financial',
    tags: ['Stripe', 'Payments', 'Routing']
  },
  {
    toolId: 'mcp_financial_core_get_balance',
    name: 'Get Financial Balance',
    description: 'Retrieves the current balance for a specified financial account.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'The ID of the financial account.' }
      },
      required: ['accountId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        balance: { type: 'number' },
        currency: { type: 'string' }
      }
    },
    category: 'Financial',
    tags: ['Financial Core', 'Balance', 'Account']
  },
  {
    toolId: 'mcp_financial_core_transfer_funds',
    name: 'Transfer Funds',
    description: 'Initiates a fund transfer between financial accounts.',
    inputSchema: {
      type: 'object',
      properties: {
        fromAccountId: { type: 'string' },
        toAccountId: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' }
      },
      required: ['fromAccountId', 'toAccountId', 'amount', 'currency']
    },
    outputSchema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string' },
        status: { type: 'string' }
      }
    },
    category: 'Financial',
    tags: ['Financial Core', 'Transfer', 'Funds']
  },
  {
    toolId: 'mcp_financial_core_get_transaction_history',
    name: 'Get Transaction History',
    description: 'Retrieves a list of transactions for a given financial account.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        limit: { type: 'number', default: 10 },
        offset: { type: 'number', default: 0 }
      },
      required: ['accountId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        transactions: { type: 'array', items: { type: 'object' } }
      }
    },
    category: 'Financial',
    tags: ['Financial Core', 'Transactions', 'History']
  },
  {
    toolId: 'mcp_financial_core_process_payment',
    name: 'Process Payment',
    description: 'Processes a payment using the financial core system.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        currency: { type: 'string' },
        paymentMethod: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['amount', 'currency', 'paymentMethod']
    },
    outputSchema: {
      type: 'object',
      properties: {
        paymentId: { type: 'string' },
        status: { type: 'string' },
        receiptUrl: { type: 'string' }
      }
    },
    category: 'Financial',
    tags: ['Financial Core', 'Payments', 'Processing']
  },
  {
    toolId: 'mcp_database_query',
    name: 'Execute Database Query',
    description: 'Executes a SQL query against the database.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The SQL query string.' },
        parameters: { type: 'array', items: { type: 'string' }, description: 'Optional query parameters.' }
      },
      required: ['query']
    },
    outputSchema: {
      type: 'object',
      properties: {
        rows: { type: 'array', items: { type: 'object' } },
        rowCount: { type: 'number' }
      }
    },
    category: 'Database',
    tags: ['Database', 'SQL', 'Query']
  },
  {
    toolId: 'mcp_database_schema',
    name: 'Get Database Schema',
    description: 'Retrieves the schema information for a specified table or the entire database.',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: { type: 'string', description: 'Optional table name to retrieve schema for.' }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        schema: { type: 'object' }
      }
    },
    category: 'Database',
    tags: ['Database', 'Schema', 'Metadata']
  },
  {
    toolId: 'mcp_database_insert',
    name: 'Insert Data into Database',
    description: 'Inserts new data into a specified database table.',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: { type: 'string' },
        data: { type: 'object', description: 'Object containing column-value pairs.' }
      },
      required: ['tableName', 'data']
    },
    outputSchema: {
      type: 'object',
      properties: {
        insertedId: { type: 'string' },
        rowCount: { type: 'number' }
      }
    },
    category: 'Database',
    tags: ['Database', 'Insert', 'Data']
  },
  {
    toolId: 'mcp_database_update',
    name: 'Update Database Data',
    description: 'Updates existing data in a specified database table.',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: { type: 'string' },
        data: { type: 'object', description: 'Object containing column-value pairs to update.' },
        where: { type: 'object', description: 'Object containing column-value pairs for the WHERE clause.' }
      },
      required: ['tableName', 'data', 'where']
    },
    outputSchema: {
      type: 'object',
      properties: {
        updatedCount: { type: 'number' }
      }
    },
    category: 'Database',
    tags: ['Database', 'Update', 'Data']
  },
  {
    toolId: 'mcp_database_delete',
    name: 'Delete Data from Database',
    description: 'Deletes data from a specified database table.',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: { type: 'string' },
        where: { type: 'object', description: 'Object containing column-value pairs for the WHERE clause.' }
      },
      required: ['tableName', 'where']
    },
    outputSchema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number' }
      }
    },
    category: 'Database',
    tags: ['Database', 'Delete', 'Data']
  },
  {
    toolId: 'mcp_twilio_send_sms',
    name: 'Send SMS',
    description: 'Sends an SMS message to a recipient.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient phone number.' },
        body: { type: 'string', description: 'Message body.' }
      },
      required: ['to', 'body']
    },
    outputSchema: {
      type: 'object',
      properties: {
        messageSid: { type: 'string' },
        status: { type: 'string' }
      }
    },
    category: 'Communication',
    tags: ['Twilio', 'SMS', 'Messaging']
  },
  {
    toolId: 'mcp_twilio_make_call',
    name: 'Make Call',
    description: 'Initiates a phone call to a recipient.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient phone number.' },
        twiml: { type: 'string', description: 'TwiML instructions for the call.' }
      },
      required: ['to', 'twiml']
    },
    outputSchema: {
      type: 'object',
      properties: {
        callSid: { type: 'string' },
        status: { type: 'string' }
      }
    },
    category: 'Communication',
    tags: ['Twilio', 'Call', 'Voice']
  },
  {
    toolId: 'mcp_twilio_verify_phone',
    name: 'Verify Phone Number',
    description: 'Verifies a phone number using Twilio Verify.',
    inputSchema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string' },
        channel: { type: 'string', enum: ['sms', 'call'], default: 'sms' }
      },
      required: ['phoneNumber']
    },
    outputSchema: {
      type: 'object',
      properties: {
        verificationSid: { type: 'string' },
        status: { type: 'string' }
      }
    },
    category: 'Communication',
    tags: ['Twilio', 'Verification', 'SMS']
  },
  {
    toolId: 'mcp_twilio_lookup_phone_number',
    name: 'Lookup Phone Number',
    description: 'Looks up information about a phone number.',
    inputSchema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string' }
      },
      required: ['phoneNumber']
    },
    outputSchema: {
      type: 'object',
      properties: {
        countryCode: { type: 'string' },
        carrier: { type: 'string' },
        type: { type: 'string' }
      }
    },
    category: 'Communication',
    tags: ['Twilio', 'Lookup', 'Phone Number']
  },
  {
    toolId: 'mcp_gemini_vision_analyze_image',
    name: 'Analyze Image (Gemini Vision)',
    description: 'Analyzes an image to extract insights using Gemini Vision.',
    inputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string' },
        prompt: { type: 'string' }
      },
      required: ['imageUrl', 'prompt']
    },
    outputSchema: {
      type: 'object',
      properties: {
        analysis: { type: 'string' }
      }
    },
    category: 'AI/ML',
    tags: ['Gemini', 'Vision', 'Image Analysis']
  },
  {
    toolId: 'mcp_gemini_natural_language_process',
    name: 'Natural Language Process (Gemini)',
    description: 'Processes natural language text using Gemini.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        task: { type: 'string', enum: ['summarize', 'sentiment', 'translate'] }
      },
      required: ['text', 'task']
    },
    outputSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' }
      }
    },
    category: 'AI/ML',
    tags: ['Gemini', 'NLP', 'Language Processing']
  },
  {
    toolId: 'mcp_gemini_text_to_speech',
    name: 'Text to Speech (Gemini)',
    description: 'Converts text into speech using Gemini.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        voice: { type: 'string', default: 'default' }
      },
      required: ['text']
    },
    outputSchema: {
      type: 'object',
      properties: {
        audioContent: { type: 'string', description: 'Base64 encoded audio content.' }
      }
    },
    category: 'AI/ML',
    tags: ['Gemini', 'TTS', 'Speech']
  },
  {
    toolId: 'mcp_gemini_speech_to_text',
    name: 'Speech to Text (Gemini)',
    description: 'Converts speech audio into text using Gemini.',
    inputSchema: {
      type: 'object',
      properties: {
        audioContent: { type: 'string', description: 'Base64 encoded audio content.' },
        languageCode: { type: 'string', default: 'en-US' }
      },
      required: ['audioContent']
    },
    outputSchema: {
      type: 'object',
      properties: {
        transcript: { type: 'string' }
      }
    },
    category: 'AI/ML',
    tags: ['Gemini', 'STT', 'Speech']
  },
  {
    toolId: 'mcp_documentation_consolidation_add_document',
    name: 'Add Document to Consolidation',
    description: 'Adds a new document to the documentation consolidation system.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['title', 'content']
    },
    outputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        status: { type: 'string' }
      }
    },
    category: 'Documentation',
    tags: ['Documentation', 'Management', 'Consolidation']
  },
  {
    toolId: 'mcp_documentation_consolidation_retrieve_document',
    name: 'Retrieve Consolidated Document',
    description: 'Retrieves a document from the documentation consolidation system by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' }
      },
      required: ['documentId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        document: { type: 'object' }
      }
    },
    category: 'Documentation',
    tags: ['Documentation', 'Retrieval']
  },
  {
    toolId: 'mcp_documentation_consolidation_search_documents',
    name: 'Search Consolidated Documents',
    description: 'Searches for documents within the documentation consolidation system.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['query']
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } }
      }
    },
    category: 'Documentation',
    tags: ['Documentation', 'Search']
  },
  {
    toolId: 'mcp_system_health_get_status',
    name: 'Get System Health Status',
    description: 'Retrieves the current health status of the system.',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        issues: { type: 'array', items: { type: 'string' } }
      }
    },
    category: 'System',
    tags: ['Health', 'Status', 'Monitoring']
  },
  {
    toolId: 'mcp_system_health_run_diagnostic',
    name: 'Run System Diagnostic',
    description: 'Runs a diagnostic check on the system to identify potential issues.',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: {
        report: { type: 'string' },
        passed: { type: 'boolean' }
      }
    },
    category: 'System',
    tags: ['Health', 'Diagnostic', 'Troubleshooting']
  },
  {
    toolId: 'mcp_system_health_get_logs',
    name: 'Get System Logs',
    description: 'Retrieves recent system logs based on specified criteria.',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['info', 'warn', 'error', 'debug'] },
        limit: { type: 'number', default: 100 }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        logs: { type: 'array', items: { type: 'string' } }
      }
    },
    category: 'System',
    tags: ['Health', 'Logs', 'Monitoring']
  },
  {
    toolId: 'mcp_trading_execution_place_order',
    name: 'Place Trading Order',
    description: 'Places a trading order on a financial exchange.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        orderType: { type: 'string', enum: ['market', 'limit'] },
        quantity: { type: 'number' },
        price: { type: 'number', description: 'Required for limit orders.' }
      },
      required: ['symbol', 'orderType', 'quantity']
    },
    outputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        status: { type: 'string' }
      }
    },
    category: 'Trading',
    tags: ['Trading', 'Orders', 'Execution']
  },
  {
    toolId: 'mcp_trading_execution_cancel_order',
    name: 'Cancel Trading Order',
    description: 'Cancels an existing trading order.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' }
      },
      required: ['orderId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' }
      }
    },
    category: 'Trading',
    tags: ['Trading', 'Orders', 'Cancel']
  },
  {
    toolId: 'mcp_trading_execution_get_order_status',
    name: 'Get Trading Order Status',
    description: 'Retrieves the current status of a trading order.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' }
      },
      required: ['orderId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        filledQuantity: { type: 'number' },
        remainingQuantity: { type: 'number' }
      }
    },
    category: 'Trading',
    tags: ['Trading', 'Orders', 'Status']
  },
  {
    toolId: 'mcp_trading_execution_get_market_data',
    name: 'Get Market Data',
    description: 'Retrieves real-time market data for a given symbol.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        dataType: { type: 'string', enum: ['quote', 'history'] }
      },
      required: ['symbol', 'dataType']
    },
    outputSchema: {
      type: 'object',
      properties: {
        data: { type: 'object' }
      }
    },
    category: 'Trading',
    tags: ['Trading', 'Market Data', 'Real-time']
  },
  {
    toolId: 'mcp_clearbit_enrich_company',
    name: 'Clearbit Enrich Company',
    description: 'Enriches company data using Clearbit API.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string' }
      },
      required: ['domain']
    },
    outputSchema: {
      type: 'object',
      properties: {
        companyData: { type: 'object' }
      }
    },
    category: 'Data Enrichment',
    tags: ['Clearbit', 'Company', 'Enrichment']
  },
  {
    toolId: 'mcp_clearbit_enrich_person',
    name: 'Clearbit Enrich Person',
    description: 'Enriches person data using Clearbit API.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string' }
      },
      required: ['email']
    },
    outputSchema: {
      type: 'object',
      properties: {
        personData: { type: 'object' }
      }
    },
    category: 'Data Enrichment',
    tags: ['Clearbit', 'Person', 'Enrichment']
  },
  {
    toolId: 'mcp_clearbit_identify_website_visitor',
    name: 'Clearbit Identify Website Visitor',
    description: 'Identifies a website visitor using Clearbit API.',
    inputSchema: {
      type: 'object',
      properties: {
        ipAddress: { type: 'string' }
      },
      required: ['ipAddress']
    },
    outputSchema: {
      type: 'object',
      properties: {
        visitorData: { type: 'object' }
      }
    },
    category: 'Data Enrichment',
    tags: ['Clearbit', 'Website', 'Visitor']
  },
  {
    toolId: 'mcp_zapier_nla_execute_action',
    name: 'Zapier NLA Execute Action',
    description: 'Executes an action via Zapier Natural Language API.',
    inputSchema: {
      type: 'object',
      properties: {
        instruction: { type: 'string', description: 'Natural language instruction for Zapier.' }
      },
      required: ['instruction']
    },
    outputSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' }
      }
    },
    category: 'Integration',
    tags: ['Zapier', 'NLA', 'Automation']
  },
  {
    toolId: 'mcp_github_create_issue',
    name: 'GitHub Create Issue',
    description: 'Creates a new issue in a GitHub repository.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' }
      },
      required: ['owner', 'repo', 'title']
    },
    outputSchema: {
      type: 'object',
      properties: {
        issueNumber: { type: 'number' },
        url: { type: 'string' }
      }
    },
    category: 'GitHub',
    tags: ['GitHub', 'Issue', 'Repository']
  },
  {
    toolId: 'mcp_github_get_issue',
    name: 'GitHub Get Issue',
    description: 'Retrieves details of a specific GitHub issue.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        issueNumber: { type: 'number' }
      },
      required: ['owner', 'repo', 'issueNumber']
    },
    outputSchema: {
      type: 'object',
      properties: {
        issue: { type: 'object' }
      }
    },
    category: 'GitHub',
    tags: ['GitHub', 'Issue', 'Details']
  },
  {
    toolId: 'mcp_github_list_issues',
    name: 'GitHub List Issues',
    description: 'Lists issues in a GitHub repository.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' }
      },
      required: ['owner', 'repo']
    },
    outputSchema: {
      type: 'object',
      properties: {
        issues: { type: 'array', items: { type: 'object' } }
      }
    },
    category: 'GitHub',
    tags: ['GitHub', 'Issue', 'List']
  },
  {
    toolId: 'mcp_github_create_pull_request',
    name: 'GitHub Create Pull Request',
    description: 'Creates a new pull request in a GitHub repository.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        title: { type: 'string' },
        head: { type: 'string', description: 'The name of the branch where your changes are implemented.' },
        base: { type: 'string', description: 'The name of the branch you want to merge your changes into.' },
        body: { type: 'string' }
      },
      required: ['owner', 'repo', 'title', 'head', 'base']
    },
    outputSchema: {
      type: 'object',
      properties: {
        pullNumber: { type: 'number' },
        url: { type: 'string' }
      }
    },
    category: 'GitHub',
    tags: ['GitHub', 'Pull Request', 'Code Review']
  },
  {
    toolId: 'mcp_github_get_pull_request',
    name: 'GitHub Get Pull Request',
    description: 'Retrieves details of a specific GitHub pull request.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        pullNumber: { type: 'number' }
      },
      required: ['owner', 'repo', 'pullNumber']
    },
    outputSchema: {
      type: 'object',
      properties: {
        pullRequest: { type: 'object' }
      }
    },
    category: 'GitHub',
    tags: ['GitHub', 'Pull Request', 'Details']
  },
  {
    toolId: 'mcp_github_list_pull_requests',
    name: 'GitHub List Pull Requests',
    description: 'Lists pull requests in a GitHub repository.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' }
      },
      required: ['owner', 'repo']
    },
    outputSchema: {
      type: 'object',
      properties: {
        pullRequests: { type: 'array', items: { type: 'object' } }
      }
    },
    category: 'GitHub',
    tags: ['GitHub', 'Pull Request', 'List']
  },
  {
    toolId: 'mcp_github_merge_pull_request',
    name: 'GitHub Merge Pull Request',
    description: 'Merges a GitHub pull request.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        pullNumber: { type: 'number' },
        mergeMethod: { type: 'string', enum: ['merge', 'squash', 'rebase'], default: 'merge' }
      },
      required: ['owner', 'repo', 'pullNumber']
    },
    outputSchema: {
      type: 'object',
      properties: {
        sha: { type: 'string' },
        merged: { type: 'boolean' }
      }
    },
    category: 'GitHub',
    tags: ['GitHub', 'Pull Request', 'Merge']
  },
  {
    toolId: 'mcp_github_add_comment_to_issue_or_pull_request',
    name: 'GitHub Add Comment',
    description: 'Adds a comment to a GitHub issue or pull request.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        issueNumber: { type: 'number' },
        body: { type: 'string' }
      },
      required: ['owner', 'repo', 'issueNumber', 'body']
    },
    outputSchema: {
      type: 'object',
      properties: {
        commentId: { type: 'number' },
        url: { type: 'string' }
      }
    },
    category: 'GitHub',
    tags: ['GitHub', 'Comment', 'Issue', 'Pull Request']
  }
];

