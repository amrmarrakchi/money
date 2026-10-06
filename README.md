# Money

A simple, personal expense tracker: expenses and incomes, their categories and subcategories, filters, and a dashboard with charts.
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
| Dashboard | The month in four figures ( income, expenses, net, savings rate, each against last month ); income and expenses over the last 12 months; where the money went ( expenses by category, ranked, with % ; a category opens to show its subcategories ); spending pace ( spent so far this month, day by day, against last month ); savings over time; the latest transactions. The arrows change the month. Each chart can be shown as a table |
| Transactions | Search ( note, category, amount ), filters by type, one or more categories ( a category takes its subcategories with it ) and period ( this month, last month, last 3 months, this year, all, custom dates ); totals of what is shown; a table on wide screens, a list by day on phones. Edit and delete; deleting asks first |
| Categories | Expense and income categories, each with its subcategories ( one level: Transport › Fuel ). A subcategory has the type and colour of its category; it can move to another category or become a category. Number of transactions and total, a category counting its subcategories. Deleting a category deletes its subcategories, after choosing where their transactions go |

A transaction can go on a category or on one of its subcategories. Adding and editing always happen in a modal: **Add** in the header ( the green button at the bottom on phones ).
The account menu has the currency ( MAD by default ) and sign out.

## Design

The look of visionOS, dark only:
- The app floats over an "environment" ( soft green, teal and violet light, `body::before` in `src/style.css` ), in glass:
  the window ( `glass-window` ), the cards inside it ( `glass-platter` ), recessed fields for the inputs ( `glass-recessed` ),
  thicker glass for sheets and the tab bar ( `glass-thick` ), denser glass for menus ( `glass-menu` ).
- The pages are in a floating tab bar beside the window, which opens to show their names when pointed at; on phones it
  floats at the bottom. Capsule buttons, pill segmented controls, large rounded corners, the window bar under the window.
- shadcn-vue components in `src/components/ui` ( button, card, dialog, alert-dialog, input, label, select, table, tabs,
  textarea, dropdown-menu, sonner, badge, separator ), copied from the shadcn-vue repository ( new-york-v4 ) and restyled.
- Accent green; font Flexo, weight 100 everywhere: no bold text.
- Charts: income in green `#22b157`, expenses in violet `#9085e9`, a pair checked against the glass to stay distinct for
  colour-blind people; amounts in text use lighter steps of the same two colours. The change against last month is
  written in words, not only shown in colour.

## API ( server/api.js )

| Method | URL | Body | Returns |
| --- | --- | --- | --- |
| POST | `/api/login` | `{ username, password }` | `{ token, user }` |
| GET | `/api/me` · `/api/data` | | the user · `{ settings, categories, transactions }` |
| POST · PUT · DELETE | `/api/transactions` · `/api/transactions/:id` | `{ type, amount, categoryId, date, note }` | the transaction |
| POST · PUT · DELETE | `/api/categories` · `/api/categories/:id` | `{ type, name, color, parentId }` · DELETE `{ moveTo }` | the category ( `parentId`: a subcategory ) |
| PUT | `/api/settings` | `{ currency }` | the settings |

Every call but the sign-in needs `Authorization: Bearer <token>`.
