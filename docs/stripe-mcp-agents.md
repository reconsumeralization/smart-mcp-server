# Stripe MCP Agents Documentation

This document outlines the various Stripe Multi-Cloud Proxy (MCP) Agents and the tools they expose. Each agent focuses on a specific Stripe product area, providing a segmented and organized approach to interacting with the Stripe API.

---

### Stripe Capital Agent

The Stripe Capital Agent provides tools for interacting with Stripe Capital financing offers.

**Tools:**

*   **`mcp_stripe_capital_get_financing_offers`**
    *   **Description:** Retrieves a list of financing offers for a given account.
    *   **Parameters:**
        *   `financial_account` (string, optional): The ID of the financial account to retrieve offers for.
        *   `status` (string, optional): Filter offers by their status (e.g., `offered`, `accepted`, `delivered`).
        *   `limit` (number, optional): A limit on the number of objects to be returned (1-100, default 10).

*   **`mcp_stripe_capital_retrieve_financing_offer`**
    *   **Description:** Retrieves a specific Stripe Capital financing offer by its ID.
    *   **Parameters:**
        *   `offer_id` (string, required): The ID of the financing offer to retrieve.

*   **`mcp_stripe_capital_mark_financing_offer_delivered`**
    *   **Description:** Marks a Stripe Capital financing offer as delivered.
    *   **Parameters:**
        *   `offer_id` (string, required): The ID of the financing offer to mark as delivered.

*   **`mcp_stripe_capital_retrieve_financing_summary`**
    *   **Description:** Retrieves a summary of a Stripe Capital financing offer.
    *   **Parameters:**
        *   `offer_id` (string, required): The ID of the financing offer to retrieve the summary for.

---

### Stripe Issuing Agent

The Stripe Issuing Agent provides tools for managing cards, cardholders, authorizations, disputes, and transactions.

**Tools:**

*   **`mcp_stripe_issuing_create_card`**
    *   **Description:** Creates a new Stripe Issuing card.
    *   **Parameters:**
        *   `cardholder` (string, required): The cardholder to issue the card to.
        *   `currency` (string, required): The currency of the card.
        *   `type` (string, required): The type of card (e.g., `virtual`).
        *   `spending_controls` (object, optional): Limits on the card's spending.

*   **`mcp_stripe_issuing_retrieve_card`**
    *   **Description:** Retrieves a specific Stripe Issuing card by its ID.
    *   **Parameters:**
        *   `card_id` (string, required): The ID of the card to retrieve.

*   **`mcp_stripe_issuing_update_card`**
    *   **Description:** Updates an existing Stripe Issuing card.
    *   **Parameters:**
        *   `card_id` (string, required): The ID of the card to update.
        *   `status` (string, optional): The new status of the card (e.g., `active`, `inactive`, `canceled`).
        *   `spending_controls` (object, optional): Updated limits on the card's spending.

*   **`mcp_stripe_issuing_list_cards`**
    *   **Description:** Lists all Stripe Issuing cards, with optional filtering.
    *   **Parameters:**
        *   `cardholder` (string, optional): Only return cards for the given cardholder.
        *   `status` (string, optional): Only return cards with the given status.
        *   `type` (string, optional): Only return cards of the given type.
        *   `limit` (number, optional): A limit on the number of objects to be returned (1-100, default 10).

*   **`mcp_stripe_issuing_create_cardholder`**
    *   **Description:** Creates a new Stripe Issuing cardholder.
    *   **Parameters:**
        *   `type` (string, required): The type of cardholder (e.g., `individual`, `company`).
        *   `name` (string, required): The full name of the cardholder.
        *   `email` (string, optional): The email address of the cardholder.
        *   `billing` (object, optional): The billing address of the cardholder.

*   **`mcp_stripe_issuing_retrieve_cardholder`**
    *   **Description:** Retrieves a specific Stripe Issuing cardholder by their ID.
    *   **Parameters:**
        *   `cardholder_id` (string, required): The ID of the cardholder to retrieve.

*   **`mcp_stripe_issuing_retrieve_authorization`**
    *   **Description:** Retrieves a specific Stripe Issuing Authorization by its ID.
    *   **Parameters:**
        *   `authorization_id` (string, required): The ID of the authorization to retrieve.

*   **`mcp_stripe_issuing_list_authorizations`**
    *   **Description:** Lists all Stripe Issuing Authorizations, with optional filtering.
    *   **Parameters:**
        *   `card` (string, optional): Only return authorizations for the given card.
        *   `cardholder` (string, optional): Only return authorizations for the given cardholder.
        *   `status` (string, optional): Only return authorizations with the given status (e.g., `pending`, `closed`).
        *   `limit` (number, optional): A limit on the number of objects to be returned (1-100, default 10).

*   **`mcp_stripe_issuing_approve_authorization`**
    *   **Description:** Approves a pending Stripe Issuing Authorization.
    *   **Parameters:**
        *   `authorization_id` (string, required): The ID of the authorization to approve.
        *   `amount` (number, optional): The amount to approve for the authorization.

*   **`mcp_stripe_issuing_decline_authorization`**
    *   **Description:** Declines a pending Stripe Issuing Authorization.
    *   **Parameters:**
        *   `authorization_id` (string, required): The ID of the authorization to decline.

*   **`mcp_stripe_issuing_create_dispute`**
    *   **Description:** Creates a new Stripe Issuing Dispute.
    *   **Parameters:**
        *   `transaction_id` (string, required): The ID of the transaction to dispute.
        *   `reason` (string, required): The reason for the dispute.

*   **`mcp_stripe_issuing_retrieve_dispute`**
    *   **Description:** Retrieves a specific Stripe Issuing Dispute by its ID.
    *   **Parameters:**
        *   `dispute_id` (string, required): The ID of the dispute to retrieve.

*   **`mcp_stripe_issuing_retrieve_transaction`**
    *   **Description:** Retrieves a specific Stripe Issuing Transaction by its ID.
    *   **Parameters:**
        *   `transaction_id` (string, required): The ID of the transaction to retrieve.

*   **`mcp_stripe_issuing_list_transactions`**
    *   **Description:** Lists all Stripe Issuing Transactions, with optional filtering.
    *   **Parameters:**
        *   `card` (string, optional): Only return transactions for the given card.
        *   `cardholder` (string, optional): Only return transactions for the given cardholder.
        *   `type` (string, optional): Only return transactions of the given type (e.g., `capture`, `refund`).
        *   `limit` (number, optional): A limit on the number of objects to be returned (1-100, default 10).

---

### Stripe Treasury Agent

The Stripe Treasury Agent provides tools for managing financial accounts, transactions, outbound transfers, outbound payments, received credits, and received debits.

**Tools:**

*   **`mcp_stripe_treasury_create_financial_account`**
    *   **Description:** Creates a new Stripe Treasury Financial Account.
    *   **Parameters:**
        *   `country` (string, required): The country of the financial account (e.g., `US`).
        *   `supported_currencies` (array, required): A list of currencies supported by the financial account (e.g., `['usd']`).
        *   `features` (object, optional): Configures features for the financial account.

*   **`mcp_stripe_treasury_retrieve_financial_account`**
    *   **Description:** Retrieves a specific Stripe Treasury Financial Account by its ID.
    *   **Parameters:**
        *   `financial_account_id` (string, required): The ID of the financial account to retrieve.

*   **`mcp_stripe_treasury_list_financial_accounts`**
    *   **Description:** Lists all Stripe Treasury Financial Accounts, with optional filtering.
    *   **Parameters:**
        *   `limit` (number, optional): A limit on the number of objects to be returned (1-100, default 10).

*   **`mcp_stripe_treasury_retrieve_transaction`**
    *   **Description:** Retrieves a specific Stripe Treasury Transaction by ID.
    *   **Parameters:**
        *   `transaction_id` (string, required): The ID of the transaction to retrieve.

*   **`mcp_stripe_treasury_list_transactions`**
    *   **Description:** Lists all Stripe Treasury Transactions, with optional filtering.
    *   **Parameters:**
        *   `financial_account` (string, optional): Only return transactions for the given Financial Account.
        *   `status` (string, optional): Only return transactions with the given status (e.g., `posted`, `void`).
        *   `flow_type` (string, optional): Only return transactions of the given flow type (e.g., `inbound_transfer`, `outbound_transfer`).
        *   `limit` (number, optional): A limit on the number of objects to be returned (1-100, default 10).

*   **`mcp_stripe_treasury_create_outbound_transfer`**
    *   **Description:** Creates an Outbound Transfer in Stripe Treasury.
    *   **Parameters:**
        *   `amount` (string, required): The amount to be transferred.
        *   `currency` (string, required): The currency of the amount.
        *   `financial_account` (string, required): The ID of the financial account to transfer funds from.
        *   `destination_payment_method` (string, required): The ID of the payment method to transfer funds to (e.g., bank account).

*   **`mcp_stripe_treasury_cancel_outbound_transfer`**
    *   **Description:** Cancels an Outbound Transfer in Stripe Treasury.
    *   **Parameters:**
        *   `outbound_transfer_id` (string, required): The ID of the outbound transfer to cancel.

*   **`mcp_stripe_treasury_create_outbound_payment`**
    *   **Description:** Creates an Outbound Payment in Stripe Treasury.
    *   **Parameters:**
        *   `amount` (string, required): The amount to be paid.
        *   `currency` (string, required): The currency of the amount.
        *   `financial_account` (string, required): The ID of the financial account to pay from.
        *   `destination_payment_method` (string, required): The ID of the payment method to pay to (e.g., bank account).

*   **`mcp_stripe_treasury_cancel_outbound_payment`**
    *   **Description:** Cancels an Outbound Payment in Stripe Treasury.
    *   **Parameters:**
        *   `outbound_payment_id` (string, required): The ID of the outbound payment to cancel.

*   **`mcp_stripe_treasury_test_create_received_credit`**
    *   **Description:** Creates a test-mode ReceivedCredit object in Stripe Treasury.
    *   **Parameters:**
        *   `amount` (string, required): The amount of the received credit.
        *   `currency` (string, required): The currency of the amount.
        *   `financial_account` (string, required): The ID of the financial account to receive the credit.

*   **`mcp_stripe_treasury_list_received_credits`**
    *   **Description:** Lists all Stripe Treasury Received Credits.
    *   **Parameters:**
        *   `financial_account` (string, optional): Only return received credits for the given Financial Account.
        *   `status` (string, optional): Only return received credits with the given status (e.g., `succeeded`, `failed`).
        *   `limit` (number, optional): A limit on the number of objects to be returned (1-100, default 10).

*   **`mcp_stripe_treasury_test_create_received_debit`**
    *   **Description:** Creates a test-mode ReceivedDebit object in Stripe Treasury.
    *   **Parameters:**
        *   `amount` (string, required): The amount of the received debit.
        *   `currency` (string, required): The currency of the amount.
        *   `financial_account` (string, required): The ID of the financial account to debit from.

---

### Stripe Go-Between Agent

The Stripe Go-Between Agent is responsible for intelligently routing Stripe API calls to the appropriate segmented Stripe MCP agents (Capital, Issuing, Treasury). It acts as a central dispatcher, ensuring that requests are directed to the correct domain-specific agent based on the tool name.

**Tools:**

*   **`mcp_stripe_router`**
    *   **Description:** Routes a Stripe API call to the correct segmented Stripe agent.
    *   **Parameters:**
        *   `toolName` (string, required): The name of the specific Stripe tool to call (e.g., `mcp_stripe_capital_get_financing_offers`).
        *   `parameters` (object, required): The parameters to pass to the target Stripe tool.
        *   `context` (object, optional): Additional context for the request, such as user information or session details, that might influence routing decisions or be passed to the underlying tool.

---

### Stripe Risk Assessment and Underwriting Agent

The Stripe Risk Assessment and Underwriting Agent focuses on leveraging third-party data for loan underwriting, credit scoring, and making informed financial decisions. This agent is crucial for KnightArcher's vision of incorporating external data for advanced risk analysis.

**Tools:**

*   **`mcp_risk_underwriting_ingest_data`**
    *   **Description:** Ingests third-party financial data for risk assessment.
    *   **Parameters:**
        *   `customer_id` (string, required): The ID of the customer for whom data is being ingested.
        *   `data` (object, required): The third-party data to be ingested (e.g., credit scores, bank statements, alternative data).
        *   `data_source` (string, required): The source of the third-party data (e.g., `Experian`, `Plaid`, `Custom_API`).

*   **`mcp_risk_underwriting_calculate_risk_score`**
    *   **Description:** Calculates a risk score for a customer based on various data points.
    *   **Parameters:**
        *   `customer_id` (string, required): The ID of the customer for whom the risk score is to be calculated.
        *   `financial_data` (object, optional): Financial data (e.g., income, existing debt, assets).
        *   `credit_score_data` (object, optional): Credit score related data.
        *   `alternative_data` (object, optional): Alternative data for risk assessment (e.g., payment history, utility bills).

*   **`mcp_risk_underwriting_make_decision`**
    *   **Description:** Makes an underwriting decision (approve/decline) based on risk assessment.
    *   **Parameters:**
        *   `customer_id` (string, required): The ID of the customer for whom the decision is being made.
        *   `risk_score` (number, required): The calculated risk score for the customer.
        *   `risk_category` (string, required): The risk category of the customer (e.g., `low`, `medium`, `high`).
        *   `loan_amount_requested` (number, optional): The amount of loan requested, if applicable. 