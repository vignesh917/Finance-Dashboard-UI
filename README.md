# Finance Dashboard (Vanilla HTML/CSS/JS)

A simple, responsive frontend-only dashboard for tracking and understanding financial activity.

## Features (matches your requirements)

### Dashboard Overview
- **Summary cards**: Total Balance, Income, Expenses
- **Time-based visualization**: Balance trend (last 30 days) using `<canvas>`
- **Categorical visualization**: Spending breakdown (expenses by category for selected month) using `<canvas>`
- **Empty states**: Charts and sections show friendly “no data” messages

### Transactions Section
- **Transaction list** with: Date, Amount, Category, Type (income/expense), Note
- **Filtering**: search (category/note), type, category, month, min/max amount
- **Sorting**: date / amount / category

### Basic Role-Based UI (frontend-simulated)
- **Viewer**: read-only (cannot add/edit/delete)
- **Admin**: can add, edit, delete transactions
- Switch roles via the **Role dropdown** in the header

### Insights Section
- Highest spending category (for selected month)
- Month-over-month expense comparison (selected month vs previous month)
- Largest transaction (all time)
- Simple monthly observation (net + expense-to-income ratio when available)

### State Management
Single centralized state in `app.js` (transactions, filters, selected role, modal editing state), with deterministic rendering.

### Optional Enhancements Included
- **Dark mode** toggle
- **Persistence** via `localStorage`
- **Export** transactions as **CSV** or **JSON**

## How to run

This is a static app (no build tools).

1. Open the folder in VS Code / Cursor
2. Open `index.html` in a browser
   - Recommended: use VS Code’s “Live Server” extension, or any simple static server

## Notes
- Currency formatting uses the browser locale and defaults to **USD**.
- All logic is frontend-only; roles are purely UI simulation as requested.

