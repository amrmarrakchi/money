# Money

A simple, personal expense tracker: expenses and incomes, their categories, filters, and a dashboard with charts.
Two accounts, each with its own data. Vue 3 + Vite, shadcn-vue ( Reka UI + Tailwind CSS 4 ), Chart.js.

## Start

```bash
npm install
npm run dev          # http://localhost:5173
```

Sign in with **amr** or **sakina**, password **1234**.

To run it without Vite ( on a home server, a NAS … ):

```bash
npm run build
npm start            # http://127.0.0.1:4173   ( PORT=… HOST=0.0.0.0 npm start to change it )
```

To try the app with example data: `npm run demo -- amr` ( or `sakina` ). It writes six months of example transactions,
and refuses an account that already has transactions.

## Data

Everything is kept in JSON files on the computer that runs the app, one per user:

```
data/amr.json        { settings, categories, transactions }
data/sakina.json
data/.secret         signs the sign-in tokens ( made on first start )
```

`data/` is in `.gitignore`: your figures never go to GitHub. To back up, copy the folder; to move to another
computer, copy it next to the app. `MONEY_DATA_DIR=/path npm start` keeps it elsewhere.
Each file is written to a temporary file then renamed, so a crash never leaves half a file.

The passwords are not stored: only a salted scrypt hash, in `server/api.js` ( `USERS` ). A sign-in lasts 30 days.

## Pages

| Page | What it does |
| --- | --- |
| Dashboard | The month in four figures ( income, expenses, net, savings rate, each against last month ); income and expenses over the last 12 months; where the money went ( expenses by category, ranked, with % ); spending pace ( spent so far this month, day by day, against last month ); savings over time; the latest transactions. The arrows change the month. Each chart can be shown as a table |
| Transactions | Search ( note, category, amount ), filters by type, one or more categories and period ( this month, last month, last 3 months, this year, all, custom dates ); totals of what is shown; a table on wide screens, a list by day on phones. Edit and delete; deleting asks first |
| Categories | Expense and income categories, with their colour, number of transactions and total. A category with transactions can be deleted after choosing where its transactions go |

Adding and editing always happen in a modal: **Add** in the header ( the green button at the bottom on phones ).
The account menu has the currency ( MAD by default ), the light / dark theme and sign out.

## Design

- shadcn-vue components in `src/components/ui` ( button, card, dialog, alert-dialog, input, label, select, table, tabs,
  textarea, dropdown-menu, sonner, badge, separator ), copied from the shadcn-vue repository ( new-york-v4 ).
- Primary colour green `#16a34a`; light and dark themes in `src/style.css`.
- Font Flexo, weight 100 everywhere: no bold text.
- Charts: income in green, expenses in violet ( `#4a3aa7`, `#9085e9` on dark ), a pair checked to stay distinct for
  colour-blind people in both themes; the change against last month is written in words, not only shown in colour.

## API ( server/api.js )

| Method | URL | Body | Returns |
| --- | --- | --- | --- |
| POST | `/api/login` | `{ username, password }` | `{ token, user }` |
| GET | `/api/me` · `/api/data` | | the user · `{ settings, categories, transactions }` |
| POST · PUT · DELETE | `/api/transactions` · `/api/transactions/:id` | `{ type, amount, categoryId, date, note }` | the transaction |
| POST · PUT · DELETE | `/api/categories` · `/api/categories/:id` | `{ type, name, color }` · DELETE `{ moveTo }` | the category |
| PUT | `/api/settings` | `{ currency }` | the settings |

Every call but the sign-in needs `Authorization: Bearer <token>`.
