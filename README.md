# Nafaka Trade

Build a full-stack web application called "Nafaka Stock Manager" for wholesale nafaka shops in Tanzania.

**1. CORE PURPOSE**

An inventory + financial management system for rice, beans, maize, etc. The shop owner sells nafaka on behalf of multiple suppliers/brands and earns commission + profit. Every bag is tracked by brand and exact weight in KG.

**2. USER AUTH & ROLES**

- Register and Login with PHONE NUMBER + PASSWORD only. No email.

- No OTP on login. 

- "Forgot Password" flow: Send OTP via SMS to reset password. Use Africa's Talking SMS API for OTP.

- Multi-tenant: Each registered user has their own isolated data. Users must never see each other's data.

- Dashboard on login.

**3. INVENTORY MANAGEMENT - "STOCK IN"**

When a lorry arrives, record a "GRN - Goods Received Note":

- Date received

- Supplier name 

- Lorry details

- For EACH BRAND in the lorry:

    - Brand Name

    - Number of bags

    - Weight per bag in KG. Allow different weights per bag in same brand.

    - Supplier price per KG 

    - Selling price per KG. Default = Supplier price. Must be editable by owner.

    - Commission rate: Default 50 TZS per KG. Editable.

System must calculate: Total KG per brand = bags * weight per bag

**4. INVENTORY MANAGEMENT - "STOCK OUT" / SALES**

When customer buys:

- Date of sale

- Customer name. Option to mark as "Credit Customer"

- Select Brand

- Enter KG sold

- Enter "Sample Loss KG". This is quantity given free as sample. Track it separately.

- Auto calculate: Stock remaining = Previous stock - Sold KG - Sample Loss KG

- Alert: "OUT OF STOCK" when brand KG reaches 0

- Loss Report: For each brand, show total "Sample Loss KG" when stock reaches 0. So owner knows how much was lost.

**5. FINANCIALS & COMMISSION LOGIC - CRITICAL**

For every sale, separate 3 things:

1.  **Supplier Amount** = Sold KG * Supplier Price per KG

2.  **Owner Commission** = Total KG Sold * 50 TZS commission per KG

3.  **Owner Extra Profit** = Sold KG * (Selling Price - Supplier Price)

Never mix commission and extra profit. Show them separately in reports.

**6. CASH FLOW / SUPPLIER LEDGER**

Per Supplier/Brand, track:

- Money Received from Sales

- Money Paid to Supplier

- Transport Costs, Offloading costs, Other Expenses per supplier

- Running Balance: How much we owe supplier / How much supplier owes us

- Date of every transaction

**7. OWNER BUSINESS P&L**

Separate section for business owner:

- Total Commission Earned

- Total Extra Profit Earned  

- Total Business Expenses: rent, fuel, salaries, etc

- Net Profit = Commission + Extra Profit - Expenses

**8. CUSTOMER CREDIT MANAGEMENT**

- Mark customer as "Credit" during sale

- Track: Total Credit Given, Total Payments, Remaining Balance

- Payment history with dates

- RED FLAG: If a debt is unpaid for > 21 days, highlight customer in red on dashboard

- Generate customer statement PDF

**9. REPORTS & INVOICES**

- Generate printable Invoice/PDF for every sale. Include shop name, date, brand, KG, price, total

- Reports: Stock Report, Sales Report, Profit Report, Supplier Statement, Loss Report

- All reports must be filterable by Date Range and by Brand/Supplier

- "Aging Stock Alert": Remind owner of any stock where last "Stock In" date is > 60 days old

**10. SETTINGS**

- Manage Brands and Suppliers

- Update Supplier Price and Selling Price per brand at any time. Keep price history.

- Manage Users/Staff with roles if needed

**11. TECH REQUIREMENTS**

- Clean, fast, mobile-first UI. Works well on phone.

- Use Supabase for database and Auth

- Use Africa's Talking API for SMS OTP

- Export reports to PDF and Excel

- Currency: TZS. Language: English + Kiswahili labels where possible

Build this as a complete, production-ready app. Start with the Dashboard, Auth, Stock In, Stock Out, and Reports pages first.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nafaka-stock-wiz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8cd523ee-e717-4143-b498-9a17c199525f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
