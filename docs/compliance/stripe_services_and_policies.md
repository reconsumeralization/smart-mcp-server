# Stripe API Services & Reference Overview

This document provides a structured overview of Stripe's API resources, endpoints, and compliance considerations for integration, white-labeling, and multi-tenant brokerage platforms.

---

## 1. Stripe API Resource Index

Stripe's API is organized around RESTful resources, each representing a core product or service. Below is a categorized index of key API resources and their primary endpoints. For full details, see the [Stripe API Reference](https://stripe.com/docs/api).

### 1.1. Core Payments & Checkout

- **Payments**
  - `/v1/payment_intents` – Create and manage payment flows.
  - `/v1/charges` – Legacy direct charge creation.
- **Checkout**
  - `/v1/checkout/sessions` – Create and manage hosted checkout sessions.
- **Payment Links**
  - `/v1/payment_links` – Generate shareable payment URLs.
- **Elements**
  - Client-side UI components for custom payment forms.
- **Terminal**
  - `/v1/terminal/connection_tokens`, `/v1/terminal/readers` – In-person payments.
- **Radar**
  - `/v1/radar/early_fraud_warnings`, `/v1/radar/value_lists` – Fraud prevention.
- **Authorization**
  - AI-based acceptance optimization (integrated in payment flows).

### 1.2. Money Movement & Platform

- **Connect**
  - `/v1/accounts` – Manage connected accounts (platforms/marketplaces).
  - `/v1/account_links`, `/v1/account_sessions` – Onboarding and embedded flows.
  - `/v1/transfers`, `/v1/payouts` – Move funds to connected accounts.
- **Payouts**
  - `/v1/payouts` – Send funds to bank accounts or debit cards.
- **Capital**
  - `/v1/capital/financing_offers` – Business financing (preview).
- **Issuing**
  - `/v1/issuing/cards`, `/v1/issuing/cardholders` – Issue and manage cards.
- **Treasury**
  - `/v1/treasury/financial_accounts` – Banking-as-a-service infrastructure.

### 1.3. Revenue, Billing & Automation

- **Billing**
  - `/v1/subscriptions`, `/v1/invoices`, `/v1/invoiceitems` – Recurring billing.
- **Revenue Recognition**
  - `/v1/revenue_recognition` – Automated revenue reporting.
- **Tax**
  - `/v1/tax/calculations`, `/v1/tax/registrations` – Tax automation.
- **Invoicing**
  - `/v1/invoices` – Create and manage invoices.
- **Sigma**
  - `/v1/sigma/scheduled_query_runs` – SQL-based analytics.
- **Data Pipeline**
  - `/v1/data_pipeline` – Data sync to warehouses (e.g., Snowflake, Redshift).

### 1.4. Additional Services

- **Payment Methods**
  - `/v1/payment_methods`, `/v1/customers/:id/payment_methods` – Store and manage payment instruments.
- **Link**
  - One-click checkout (integrated in payment flows).
- **Financial Connections**
  - `/v1/financial_connections/accounts` – Link and access customer financial data.
- **Identity**
  - `/v1/identity/verification_sessions` – Online identity verification.
- **Atlas**
  - Startup incorporation and setup (dashboard-based).
- **Climate**
  - `/v1/climate/orders` – Carbon removal purchases.

---

## 2. Stripe Partner, Reseller, and Compliance Policies

### 2.1. Integration & Branding

- **Independent Contractor**: Your entity remains independent; not an agent or employee of Stripe.
- **Branding**: Use Stripe marks per the [Stripe Marks Usage Agreement](https://stripe.com/partners/marks). Do not alter or remove Stripe branding without written approval.
- **Co-Branding**: Possible with Stripe approval; your marks may appear alongside Stripe’s.

### 2.2. Resale & Distribution

- **Non-Exclusive**: Appointment as a reseller/distributor is non-exclusive.
- **Permitted Purpose**: Resale and marketing must promote Stripe services only.
- **Geographic Restrictions**: Only resell in Stripe-supported countries.
- **End-User Terms**: Ensure end-users accept applicable Stripe terms (e.g., Terminal Purchase Terms).
- **No Sub-Distribution**: Cannot resell to other resellers without Stripe’s consent.

### 2.3. Restrictions & Obligations

- **Restricted Businesses**: Do not resell to entities on Stripe’s [Restricted Businesses list](https://stripe.com/restricted-businesses).
- **Prohibited Use Cases**: No resale for unlawful, personal, or benchmarking purposes.
- **No Binding Authority**: You cannot bind Stripe to obligations or agreements.
- **Compliance**: Adhere to all applicable laws (financial, data privacy, anti-corruption, etc.).

### 2.4. Program Requirements

- **Partner Portal**: Maintain an account for communications and program benefits.
- **Lead Data**: Obtain clear, lawful consent before sharing lead data with Stripe.

---

## 3. Regulatory & Legal Landscape

### 3.1. United States

- **Key Regulators**: FinCEN, OFAC, FTC, CFPB.
- **Money Services Business (MSB)**: Accepting and transmitting funds may require federal (FinCEN) and state licensing, plus AML/KYC programs.
- **Exemptions**:
  - **Payment Processor Exemption**: Applies if you facilitate payments for goods/services, use regulated networks, and have a formal agreement with the payee.
  - **Agent of the Payee**: In many states, acting as an agent for the merchant (payee) exempts you from money transmitter status.
- **Platform Model**: By using Stripe Connect, Stripe is the regulated entity. Your platform must not take possession/control of funds; money must flow directly from customer to Stripe to merchant.
- **Indirect Responsibilities**: Due diligence on sub-merchants, fraud monitoring, and compliance with Stripe’s terms.

### 3.2. Canada

- **Key Regulators**: FINTRAC, Bank of Canada.
- **MSB Registration**: Required for businesses transmitting funds, unless exempt as an agent of a registered MSB (e.g., Stripe).
- **PCMLTFA**: Governs AML/CTF compliance.
- **RPAA**: New framework for Payment Service Providers (PSPs); will require registration and risk management.
- **Agent Model**: If acting as Stripe’s agent and Stripe is registered, you may be exempt from separate MSB registration.
- **Ongoing Compliance**: Monitor RPAA implementation and ensure platform compliance as regulations evolve.

---

## 4. Stripe API Usage: Technical & Compliance Best Practices

- **Authentication**: Always authenticate API requests using your secret API keys (`sk_test_*` for test mode, `sk_live_*` for live mode). Never expose secret keys in client-side code, public repositories, or anywhere they could be accessed by unauthorized parties. All requests must be made over HTTPS. [See: Authentication](https://stripe.com/docs/api/authentication)
- **Idempotency**: For POST requests that create objects (such as charges or customers), use the `Idempotency-Key` header to safely retry requests without accidentally performing the same operation multiple times. [See: Idempotent Requests](https://stripe.com/docs/api/idempotent_requests)
- **Pagination**: When listing resources, use the `limit`, `starting_after`, and `ending_before` parameters to paginate results efficiently and avoid timeouts. [See: Pagination](https://stripe.com/docs/api/pagination)
- **Expanding Responses**: Use the `expand[]` parameter to include related objects in API responses, reducing the need for additional requests. [See: Expanding Responses](https://stripe.com/docs/api/expanding_objects)
- **Metadata**: Attach custom key-value pairs to most Stripe objects using the `metadata` field for internal tracking, reconciliation, or integration needs. [See: Metadata](https://stripe.com/docs/api/metadata)
- **Versioning**: Specify the API version with the `Stripe-Version` header to ensure consistent behavior across requests, especially when upgrading or integrating with new features. [See: Versioning](https://stripe.com/docs/api/versioning)
- **Error Handling**: Implement robust error handling by checking HTTP status codes and parsing error objects returned by the API. Handle specific error types such as `card_error`, `invalid_request_error`, `api_error`, and `idempotency_error` as documented. [See: Errors](https://stripe.com/docs/api/errors)
- **Connected Accounts**: To perform actions on behalf of connected accounts (e.g., in a platform or marketplace model), include the `Stripe-Account` header with the connected account’s ID (format: `acct_*`). [See: Connected Accounts](https://stripe.com/docs/api/authentication#authentication-as-a-connected-account)
- **Security**: Never log or transmit full card numbers, CVCs, or secret API keys. Use Stripe’s client libraries and PCI-compliant methods for handling sensitive data.

---

*For the latest and most comprehensive guidance, always consult the [official Stripe API documentation](https://stripe.com/docs/api) and your Stripe Partner/Reseller agreements. This document is for technical and compliance reference only and does not constitute legal advice.*