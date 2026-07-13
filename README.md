# Household Finance Dashboard MVP v1

Mobile-first personal finance dashboard for a married couple using Hyundai Card CSV exports.

## MVP v1 Scope

Implemented:

- Supabase email magic-link authentication
- Household create/join flow for husband and wife access
- Hyundai Card CSV upload
- Transaction import and normalization
- Supabase Storage archive for uploaded statements
- Dashboard metrics
- Charts for monthly trend, categories, merchants, installments, coffee, and Coupang
- Monthly analysis
- Merchant rule learning from category changes

Prepared but not implemented:

- OCR
- PDF import
- Multiple card companies
- Bank account integration
- AI spending recommendations

## Setup

1. Create a Supabase project.
2. Apply `supabase/migrations/20260713000000_mvp_v1.sql`.
3. Copy `.env.example` to `.env.local`.
4. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Run:

```bash
npm install
npm run dev
```

## Data Model

The MVP schema includes:

- `users`
- `households`
- `household_members`
- `statements`
- `transactions`
- `categories`
- `merchant_rules`
- `monthly_income`
- `goals`

RLS is enabled on application tables. Statement CSV files are stored in the private `statements` Supabase Storage bucket under `{household_id}/{period_month}/...`.

## Import Behavior

The importer decodes UTF-8 and EUC-KR CSV files, detects Hyundai-style headers, normalizes merchant names, computes a statement checksum to prevent duplicate imports, uploads the original CSV, and stores normalized transactions.

When a user changes a transaction category, a `merchant_rules` row is learned for that normalized merchant and applied to matching household transactions. Future imports use the learned rule automatically.
