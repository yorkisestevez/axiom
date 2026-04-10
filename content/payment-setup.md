# Payment Setup Guide

Complete walkthrough for setting up all three payment processors. Total time: ~30 minutes.

---

## The Strategy

| Tier | Processor | Fee | Target Buyer |
|------|-----------|-----|--------------|
| **Standard** | Gumroad | 10% + $0.50 | Normies, first-time buyers |
| **Direct** | Stripe | 1.5% (USDC) · 2.9% (card) | Power users, savings-conscious |
| **Sovereign** | NOWPayments | 0.5% | Crypto-native, privacy-first |

Each tier targets a different buyer persona. Same product, same $49, different checkout flow.

---

## 1. Gumroad (Already Live)

✅ **Status:** Already set up at `https://yorkistevez.gumroad.com/l/axiom-saas-starter`

No action needed. Continue receiving credit card sales through Gumroad.

---

## 2. Stripe Setup (15 minutes)

Stripe is now your "Direct" tier. Cheaper fees than Gumroad, supports USDC stablecoin natively.

### Step 2.1 — Create Stripe Account

1. Go to **https://dashboard.stripe.com/register**
2. Sign up with email
3. Select **Canada** as country, **Business (sole proprietorship)** or register under Golden Maple Landscaping Inc.
4. Complete the verification (business name, address, tax info, bank details)

**Important:** Gumroad payouts go to Golden Maple Inc. — use the same entity for Stripe for bookkeeping sanity.

### Step 2.2 — Enable Stablecoin Payments

Stripe's Pay with Crypto feature is in the dashboard:

1. In Stripe Dashboard → **Settings** → **Payment methods**
2. Scroll to **Crypto** section (powered by Bridge, Stripe's stablecoin acquisition)
3. Click **Enable** for USDC
4. Stripe will verify your business again if needed
5. Once approved, USDC becomes a payment option on all Checkout Sessions and Payment Links

**Supported:** USDC on Ethereum, Base, Polygon, and Solana (Stripe auto-bridges).

### Step 2.3 — Create the Product

1. Dashboard → **Products** → **Add product**
2. Name: `Axiom SaaS Starter Pack`
3. Description: (copy from Gumroad listing)
4. Price: **$49 USD** (one-time)
5. **Upload file:** click "Add file" and upload `C:\Users\yorki\.openclaw\axiom\packs\axiom-saas-starter-pack.zip`
6. Save

Stripe will automatically email buyers a secure download link after purchase.

### Step 2.4 — Create a Payment Link

1. On the product page, click **Create payment link**
2. Enable **Crypto (USDC)** payment method
3. Optional: Add a custom thank-you page URL (you can leave default)
4. Click **Create link**
5. Copy the URL (looks like `https://buy.stripe.com/abc123xyz`)

### Step 2.5 — Give Me the URL

Paste the Stripe payment link URL into the chat and I'll wire it into the landing page `#checkout-stripe` button.

---

## 3. NOWPayments Setup (15 minutes)

NOWPayments is your "Sovereign" tier. Non-custodial (money goes straight to your wallet), accepts 300+ cryptocurrencies, 0.5% fee.

### Step 3.1 — Create NOWPayments Account

1. Go to **https://nowpayments.io**
2. Click **Sign up**
3. Register with email, verify
4. Enable 2FA immediately (crypto account security matters)

### Step 3.2 — Add Wallet Addresses

**You need a wallet to receive the crypto.** If you don't have one yet:
- **For BTC:** Download Sparrow Wallet (desktop, recommended) or Bluewallet (mobile)
- **For ETH/USDC:** Use Rabby Wallet or MetaMask
- **For SOL:** Phantom Wallet

Write down your seed phrase on paper. Store it in a safe. **Never type it into any computer.** This is the one thing you cannot outsource or recover.

In NOWPayments dashboard:
1. Go to **Store Settings** → **Outcome wallets**
2. Add your receiving addresses:
   - **BTC:** Your Bitcoin address (starts with `bc1...` or `3...`)
   - **ETH/USDC/USDT:** Your Ethereum address (starts with `0x...`)
   - **SOL:** Your Solana address (base58 string)
3. Save

**Non-custodial mode:** NOWPayments will forward payments directly to your wallets. They never hold your funds.

### Step 3.3 — Get API Key

1. Dashboard → **Settings** → **API keys**
2. Click **Create API key**
3. Name it `axiom-check-production`
4. Copy the key (save it in your password manager)
5. **DO NOT paste this into the chat** — I can't handle API keys

### Step 3.4 — Create a Payment Link

**Option A: Invoice API (full automation — requires the API key)**

For this, I need a Netlify Function deployed to call the NOWPayments API on demand. I'll build the function; you paste the API key into Netlify's environment variables (not in chat).

**Option B: Hosted Invoice (simplest — no code)**

1. Dashboard → **Payment links** → **Create new**
2. Product name: `Axiom SaaS Starter Pack`
3. Amount: **$49 USD**
4. Accepted currencies: BTC, ETH, USDC, USDT, SOL, LTC (select all you want)
5. Success URL: `https://axiom-ai.netlify.app/thank-you` (we'll create this page)
6. Webhook URL: leave blank for now
7. Create and copy the link

### Step 3.5 — Give Me the URL

Paste the NOWPayments payment link URL and I'll wire it into the landing page `#checkout-crypto` button.

---

## 4. Fulfillment — How Buyers Get the Zip

Each processor handles delivery differently:

| Processor | How Delivery Works |
|-----------|-------------------|
| **Gumroad** | Already uploaded the zip. Auto-delivered via receipt email. |
| **Stripe** | Upload the zip to the Stripe Product. Auto-delivered via Stripe's secure link in receipt email. |
| **NOWPayments** | NOWPayments doesn't handle files. Options: **(a)** Success URL redirect to a protected download page, or **(b)** Webhook → email via Resend/SendGrid, or **(c)** Manual delivery from your email for first 10 sales until you automate. |

**Recommendation for NOWPayments MVP:** Use the success URL to redirect buyers to a thank-you page with a direct download link from the GitHub release. Security-through-obscurity isn't perfect, but the pack value is in the skills themselves — even if the link leaks, it doesn't hurt the business.

**Or:** for maximum security, I can build a Netlify Function that:
1. Receives the NOWPayments webhook on payment confirmation
2. Generates a signed URL valid for 24 hours
3. Emails it to the buyer via Resend ($0-$20/mo)

That's a bit more infrastructure but fully automated. Let me know if you want to go that route.

---

## 5. After Setup

Once you have both URLs:

1. Paste them in the chat
2. I'll update `site/index.html` to point the buttons at the real URLs
3. Commit, push, Netlify rebuilds
4. Test each flow with a small amount of crypto (or Stripe test mode)
5. You're live with 3 payment tiers

---

## Fee Comparison Cheat Sheet

At 100 sales/month at $49:

| Processor | Per-Sale Fee | Monthly Fee Total | vs Gumroad Savings |
|-----------|-------------|-------------------|-------------------|
| Gumroad | $5.40 | $540 | baseline |
| Stripe (card) | $1.72 | $172 | **$368/mo saved** |
| Stripe (USDC) | $0.73 | $73 | **$467/mo saved** |
| NOWPayments | $0.24 | $24 | **$516/mo saved** |

Every crypto-paying customer is nearly $5 more net revenue for you vs a Gumroad credit card buyer.

---

## Questions?

Open an issue or ask in the chat. Setup is one-time — once all three are wired up, you never touch them again.
