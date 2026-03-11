

## Current State Analysis

**Existing email functionality: NONE.** The project has zero email sending infrastructure:
- No custom email domain configured
- No `auth-email-hook` edge function
- No transactional email templates
- No `send-transactional-email` edge function
- The only "notifications" are in-app announcements (table `announcements`) displayed in the UI

**Auth emails (signup verification, password reset)** are handled by Lovable Cloud's default email system — these work but use generic branding.

---

## What Needs to Be Built

### Category 1: Auth Emails (items 1-2)

| Email | Status | Action |
|-------|--------|--------|
| Email xác thực tài khoản (verification) | Already working via default system | Optional: brand with custom domain |
| Email đăng ký thành công (welcome) | Not sent currently | Requires custom auth email templates |

To customize these, a **custom email domain** must be configured first via the email setup dialog, then auth templates scaffolded.

### Category 2: Transactional Emails (items 3-5)

| Email | Trigger Point | Edge Function to Modify |
|-------|--------------|------------------------|
| Check ranking hoàn thành + biến động | After queue job completes | `process-ranking-queue` |
| Thanh toán thành công/thất bại | After webhook processes payment | `sepay-webhook` |
| Gần hết credit (< 1000) | After credits deducted | `process-ranking-queue` |

These require:
1. Custom email domain setup
2. Transactional email scaffolding (`scaffold_transactional_email`)
3. 3-4 email templates (ranking complete, payment success, payment failed, low credit)
4. Trigger logic added to existing edge functions

---

## Implementation Plan

### Step 1: Set up custom email domain
- Open the email setup dialog for user to configure their sender domain (e.g., `notify@yourdomain.com`)
- DNS verification must complete before emails can actually send

### Step 2: Scaffold auth email templates
- Use `scaffold_auth_email_templates` to create branded signup verification + welcome emails
- Apply project styling (colors from `index.css`, logo from `src/assets/logo.webp`)
- Deploy `auth-email-hook`

### Step 3: Scaffold transactional email templates
- Use `scaffold_transactional_email` to create the sending infrastructure
- Create 4 templates:
  - **ranking-complete**: Summary of check results + keywords with significant rank changes (±5 positions or more)
  - **payment-success**: Order details, credits added, new balance
  - **payment-failed**: Order details, suggested retry
  - **low-credit-warning**: Current balance, link to billing page

### Step 4: Wire triggers into existing edge functions
- **`process-ranking-queue`**: After job completes, calculate rank changes, send ranking-complete email. Check remaining balance, if < 1000 send low-credit email
- **`sepay-webhook`**: After `process_payment_webhook` RPC succeeds/fails, send payment-success or payment-failed email

### Step 5: Add user email preferences (optional)
- Add a toggle in Settings page to enable/disable each email type
- Store preferences in a new `email_preferences` table

---

## Prerequisites Before Implementation

The first step requires user action: **configuring a custom email domain**. Without this, no transactional or custom auth emails can be sent.

