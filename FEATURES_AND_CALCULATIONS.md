# Abenka Vault Features and Calculations

This document explains the main Abenka Vault features and the calculation rules currently implemented in the backend.

The most important calculation logic lives in these services:

- `backend/src/revenue/revenue.service.ts`
- `backend/src/sales/sales.service.ts`
- `backend/src/company/company.service.ts`
- `backend/src/dashboard/dashboard.service.ts`
- `backend/src/equity/equity.service.ts`
- `backend/src/payouts/payouts.service.ts`
- `backend/src/contributions/contributions.service.ts`
- `backend/src/invoices/invoices.service.ts`

## Product Overview

Abenka Vault tracks company projects, founder contributions, sales contribution, revenue, invoices, payouts, and equity allocation. The system supports founder, admin, and accountant roles.

The main product areas are:

- Authentication and role-based access
- Projects and project teams
- Contribution tracking
- Revenue and expense tracking
- Sales weighting
- Equity allocation and cap table
- Founder and company dashboards
- Hourly payouts and profit-share payouts
- Client and invoice management
- Company settings
- CSV exports and audit logs

## Roles

### Founder

Founders can view their own dashboard, add and manage contributions for projects they can access, view project-level details, and see their calculated hours, points, notional income, balance, and equity.

### Admin

Admins can manage users, projects, company dashboard data, contributions, revenue, payouts, equity allocation, clients, invoices, company settings, and audit data.

### Accountant

Accountants can access finance-related company data such as revenue, payouts, invoices, and dashboard summaries.

## Projects

Projects are the main container for work and business tracking. A project can have:

- Owner
- Team members
- Start and end dates
- Status
- Monthly revenue pipeline
- Contributions
- Revenue entries
- Sales entries
- Client and invoice records indirectly through finance workflows

The `monthlyRevenuePipeline` field is used in the revenue summary to measure progress toward the Sprout phase target.

## Contributions

Contribution records are created per project and per user.

Supported contribution types:

- `TIME`
- `CASH`
- `OTHER`

### Contribution Points

Points are calculated when a contribution is created or updated.

Formula:

```text
TIME contribution points = hours
CASH contribution points = amount
OTHER contribution points = otherPoints
```

Examples:

```text
10 TIME hours = 10 points
5000 CASH amount = 5000 points
25 OTHER points = 25 points
```

Important notes:

- TIME contributions are used for hour-based equity and hourly payout calculations.
- CASH and OTHER contributions increase points but are not used in the current hour-based equity pool calculation.
- `deferToEquity` is stored on contributions and excludes TIME contributions from hourly payout preparation.
- `conversionRate` is stored but is not currently used in the payout or equity conversion formulas.

## Revenue and Profit

Revenue entries are tracked per project.

Supported revenue entry types:

- `MONTHLY_REVENUE`
- `ONE_TIME_REVENUE`
- `EXPENSE`

### Revenue Totals

Formula:

```text
totalMonthlyRevenue = sum of all MONTHLY_REVENUE amounts
totalOneTimeRevenue = sum of all ONE_TIME_REVENUE amounts
totalRevenue = totalMonthlyRevenue + totalOneTimeRevenue
totalExpense = sum of all EXPENSE amounts
netRevenue = totalRevenue - totalExpense
```

In business terms, `netRevenue` is the current profit-style number calculated by the app:

```text
profit / net revenue = all revenue - all expenses
```

The service rounds returned values to 2 decimal places.

### Revenue by Project

For each project, the service separately totals:

```text
project monthlyRevenue = sum of MONTHLY_REVENUE entries for that project
project oneTimeRevenue = sum of ONE_TIME_REVENUE entries for that project
project expense = sum of EXPENSE entries for that project
```

### Sprout Phase Revenue Target

The Sprout target is hard-coded as:

```text
sproutTargetAmount = 1500000
```

The app calculates phase monthly revenue from project pipeline values:

```text
currentMonthRevenue = sum of project.monthlyRevenuePipeline across all projects
remainingToReach15Lakh = max(0, 1500000 - currentMonthRevenue)
```

Important note:

- Booked revenue entries and project pipeline revenue are separate numbers.
- `totalRevenue` comes from revenue entries.
- `currentMonthRevenue` comes from project `monthlyRevenuePipeline`.

## Sales Weighting

Sales entries convert sales value into notional value and synthetic contribution hours.

Constants:

```text
notionalRatePerHour = 1500
firstYearSalesWeightage = 12%
secondYearAndLaterSalesWeightage = 5%
firstYearMonths = 12
```

### Effective Sales Amount

The app compares the sales entry date with the project start date.

Formula:

```text
monthsDiff = months between project.startDate and salesEntry.entryDate

if monthsDiff < 12:
  effectiveSalesAmount = salesAmount * 12%
else:
  effectiveSalesAmount = salesAmount * 5%
```

### Sales Allocation to Users

Each sales entry has allocation rows. Allocation percentages must total 100%.

Formula per allocation:

```text
userSalesNotional = effectiveSalesAmount * (contributionPercent / 100) * phaseMultiplier
userSalesHours = userSalesNotional / 1500
```

The `phaseMultiplier` comes from the first company phase ordered by `sortOrder`. If no multiplier exists, the default is `1`.

Example:

```text
salesAmount = 1000000
project is in first 12 months
effectiveSalesAmount = 1000000 * 12% = 120000
user allocation = 50%
phaseMultiplier = 1

userSalesNotional = 120000 * 50% * 1 = 60000
userSalesHours = 60000 / 1500 = 40 hours
```

## Hours

The app uses two hour concepts.

### Real Contribution Hours

Real hours come from TIME contributions.

Formula:

```text
realUserHours = sum of TIME contribution hours for the user
realCompanyHours = sum of TIME contribution hours for all users
```

### Sales-Derived Hours

Sales-derived hours come from weighted sales notional value.

Formula:

```text
salesDerivedHours = salesNotional / 1500
```

### Total Hours for Dashboard and Live Equity

Formula:

```text
userTotalHours = realUserHours + userSalesDerivedHours
companyTotalHours = realCompanyHours + companySalesDerivedHours
```

These total hours are used in company dashboard founder summaries and live allocated equity units.

## Equity

There are two equity calculations in the app today.

### 1. Recorded Equity Allocation

Recorded equity allocation is created by the equity calculation endpoint. It stores cap table rows in `EquityAllocation`.

This calculation uses TIME contributions only.

Formula:

```text
totalHours = sum of TIME contribution hours in scope
userHours = sum of user's TIME contribution hours in scope
sharesAllocated = (userHours / totalHours) * 100
```

The allocation stores:

- User hours as `points`
- Total hours as `totalPoints`
- Equity percentage as `sharesAllocated`
- Vesting start date
- Cliff months
- Vesting months
- Optional project scope

If `totalHours` is `0`, no allocation rows are created.

### 2. Live Allocated Equity Units

The company and founder dashboards also calculate live equity units from total hours, including sales-derived hours.

Formula:

```text
equityPoolQty = first company phase equityPoolQty, or 1500 if missing
allocatedEquityUnits = (userTotalHours / companyTotalHours) * equityPoolQty
equityPercent = (userTotalHours / companyTotalHours) * 100
```

Where:

```text
userTotalHours = user TIME hours + user sales-derived hours
companyTotalHours = company TIME hours + company sales-derived hours
```

Important note:

- Recorded cap table allocation uses TIME hours only.
- Live dashboard equity uses TIME hours plus sales-derived hours.
- These two values can differ.

## Notional Income

Notional income is calculated for founder and company dashboards.

Constants:

```text
notionalRatePerHour = 1500
```

Formula:

```text
notionalIncome = (user TIME hours * 1500) + userSalesNotional
```

Important note:

- TIME hours are multiplied by 1500.
- Sales notional is added directly.
- Sales notional is not multiplied by 1500 again.

## Withdrawn Income and Balance

Executed payouts reduce the founder's available Abenka balance.

Formula:

```text
withdrawnIncome = sum of EXECUTED payout amounts for the user
balanceAbenka = notionalIncome - withdrawnIncome
```

Pending payouts are shown separately and do not count as withdrawn until executed.

## Payouts

The app supports hourly payouts, profit-share payouts, manual payouts, executed payouts, and deferred-to-equity status.

### Hourly Payout Preparation

Hourly payout preparation uses TIME contributions in a date range.

Conditions:

```text
contribution.type = TIME
contribution.date >= periodStart
contribution.date <= periodEnd
contribution.deferToEquity = false
```

Formula:

```text
userPeriodHours = sum of eligible TIME hours for the user
hourlyRate = user.hourlyRate
hourlyPayoutAmount = userPeriodHours * hourlyRate
```

If the calculated amount is `0` or less, no payout is created.

Created payouts have:

```text
type = HOURLY
status = PENDING
```

### Profit-Share Payout

Profit-share payouts use the latest company-wide recorded equity allocation for each user.

Formula:

```text
profitPayoutAmount = totalProfitShareAmount * (latestUserSharesAllocated / 100)
```

Created payouts have:

```text
type = PROFIT
status = PENDING
```

Important note:

- Profit-share payout uses recorded `EquityAllocation.sharesAllocated`.
- It does not use the live dashboard equity units calculation.

### Execute Payout

Executing a payout changes:

```text
status = EXECUTED
```

Only executed payouts are counted as withdrawn income.

### Defer Payout to Equity

Deferring a payout changes:

```text
status = DEFERRED_TO_EQUITY
```

The current implementation accepts a conversion rate but does not convert the payout into additional equity.

## Founder Dashboard

The founder dashboard returns the founder's private summary.

Calculated values include:

- Current phase
- Total company hours
- Founder's TIME hours
- Founder's sales-derived hours
- Founder's total points
- Recent contributions
- Allocated equity units
- Equity percent
- Notional income
- Withdrawn income
- Balance Abenka
- Revenue summary

Key formulas:

```text
founderTotalHours = founder TIME hours + founder sales-derived hours
allocatedEquity = (founderTotalHours / companyTotalHours) * equityPoolQty
equityPercent = (founderTotalHours / companyTotalHours) * 100
notionalIncome = (founder TIME hours * 1500) + founderSalesNotional
balanceAbenka = notionalIncome - executedPayouts
```

## Admin Company Dashboard

The admin company dashboard gives company-wide visibility.

It includes:

- User count
- Project count
- Cap table
- Founder summaries
- Contribution hours by project
- Top contributors
- Pending payouts
- Revenue summary
- Company phases

### Founder Summary

For each user:

```text
totalHours = TIME hours + sales-derived hours
hoursFromProjects = TIME hours
hoursFromSales = sales-derived hours
allocatedEquity = (totalHours / companyTotalHours) * equityPoolQty
equityPercent = (totalHours / companyTotalHours) * 100
notionalIncome = (TIME hours * 1500) + salesNotional
withdrawnIncome = sum of EXECUTED payouts
balanceAbenka = notionalIncome - withdrawnIncome
```

### Top Contributors

Top contributors are sorted by total contribution points.

Formula:

```text
totalPoints = sum of contribution.points for the user
```

Then the app sorts users by `totalPoints` descending and returns the top 10.

### Contribution Hours by Project

Contribution hours by project use TIME contributions only.

Formula:

```text
projectFounderHours = sum of TIME hours for a founder on a project
allProjectsFounderHours = sum of TIME hours for a founder across all projects
```

## Company Health

Company health returns four headline numbers.

Formula:

```text
totalRevenue = revenueSummary.totalRevenue
totalExpense = revenueSummary.totalExpense
totalExecutedPayouts = sum of EXECUTED payout amounts
totalNotionalIncome = sum over all users of ((TIME hours * 1500) + salesNotional)
```

If revenue or sales calculations fail, the service falls back to zero-style defaults.

## User Dashboard

The user dashboard returns a selected user's:

- User profile
- Contributions
- Total hours
- Total points
- Project summary
- Equity allocations
- Vesting timeline
- Payouts
- Allocated equity units

Key formulas:

```text
timeHours = sum of user's TIME contribution hours
salesHoursForUser = user's sales-derived hours
totalHours = timeHours + salesHoursForUser
totalPoints = sum of user's contribution points
allocatedEquityUnits = (totalHours / companyTotalHours) * equityPoolQty
```

Project summary:

```text
project totalHours = sum of user's TIME hours for the project
project totalPoints = sum of user's points for the project
project contributionCount = count of user's contributions for the project
```

Equity allocation quantity in the vesting list:

```text
equityQty = (sharesAllocated / 100) * equityPoolQty
```

## Invoices

Invoices are linked to clients and have line items.

### Invoice Number

Invoice number format:

```text
ABIYYYYMM/N
```

Where:

- `YYYY` is the invoice year.
- `MM` is the invoice month.
- `N` is the count of existing invoices for that month plus 1.

Example:

```text
ABI202605/1
```

### Invoice Total

Formula:

```text
invoiceTotalAmount = sum of lineItem.amount
```

Important note:

- The service does not multiply `quantity * amount`.
- Each line item's `amount` is treated as the final line total.

## Company Settings

Company settings store company profile and bank details used for display and operational workflows.

Current company settings logic is CRUD only. It does not perform revenue, profit, payout, or equity calculations.

## Exports

Exports generate CSV data for areas such as contributions and cap table.

Exports mainly read already-calculated or stored values. They do not introduce separate calculation formulas.

## Important Current Assumptions

- `1500` is the hard-coded notional hourly rate used for dashboards and sales-derived hours.
- `1500000` is the hard-coded Sprout target amount.
- The first company phase ordered by `sortOrder` is treated as the current phase for phase multiplier and equity pool quantity.
- CASH and OTHER contributions affect points but not TIME-hour-based payout preparation.
- Sales-derived hours affect live dashboard equity, but not recorded equity allocation rows.
- Profit-share payouts use recorded equity allocation percentages, not live dashboard equity percentages.
- `deferToEquity` excludes TIME contributions from hourly payout preparation.
- Payout `conversionRate` is accepted in some flows but does not currently convert cash to equity.
- Invoice line item `amount` is treated as the final line total.

## Quick Formula Reference

```text
Contribution points:
TIME = hours
CASH = amount
OTHER = otherPoints

Revenue:
totalRevenue = monthlyRevenue + oneTimeRevenue
netRevenue = totalRevenue - expenses

Sprout target:
remainingToReach15Lakh = max(0, 1500000 - sum(project.monthlyRevenuePipeline))

Sales:
effectiveSalesAmount = salesAmount * 12% for first 12 months, otherwise salesAmount * 5%
salesNotional = effectiveSalesAmount * allocationPercent * phaseMultiplier
salesHours = salesNotional / 1500

Hours:
userTotalHours = TIME hours + salesHours
companyTotalHours = company TIME hours + company salesHours

Live equity:
allocatedEquityUnits = (userTotalHours / companyTotalHours) * equityPoolQty
equityPercent = (userTotalHours / companyTotalHours) * 100

Recorded equity:
sharesAllocated = (user TIME hours / total TIME hours) * 100

Notional income:
notionalIncome = (TIME hours * 1500) + salesNotional

Balance:
balanceAbenka = notionalIncome - executedPayouts

Hourly payout:
hourlyPayout = eligible TIME hours * user.hourlyRate

Profit payout:
profitPayout = totalProfitShareAmount * (latest recorded sharesAllocated / 100)

Invoice total:
invoiceTotalAmount = sum(lineItem.amount)
```
