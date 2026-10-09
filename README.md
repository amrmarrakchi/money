# Money

A simple, personal expense tracker: expenses and incomes, their categories and subcategories, filters, a dashboard with charts, and a grocery list.
Two accounts, each with its own data. Frontend: Vue 3 + Vite, shadcn-vue ( Reka UI + Tailwind CSS 4 ), Chart.js.
Backend: a Laravel API ( `backend/` ) with a database, serving the frontend too: **one domain** for both.

```
money/
  src/        the frontend ( Vue )
  backend/    the Laravel app: the API, the database, and the built frontend in backend/public
```

## Develop

```bash
# backend ( once )
cd backend
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed       # creates the tables and the accounts amr and sakina
php artisan serve                # http://127.0.0.1:8000  ( the API )

# frontend ( another terminal, at the project root )
npm install
npm run dev                      # http://localhost:5173  ( /api is forwarded to the Laravel server )
```

Sign in with **amr** or **sakina**, password **1234** ( or the `MONEY_AMR_PASSWORD` / `MONEY_SAKINA_PASSWORD` set in `backend/.env` before seeding ).
To try the app with example data: `php artisan money:demo amr` ( six months of example transactions; it refuses an account that has some ).

## Deploy ( one domain )

```bash
npm ci && npm run build          # writes the frontend into backend/public ( index.html, assets/, fonts/ )
```

Then put the `backend/` folder on a PHP 8.2+ host and point the domain's **document root to `backend/public`**:

```bash
cd backend
composer install --no-dev --optimize-autoloader
cp .env.example .env && php artisan key:generate
#   in .env:  APP_ENV=production  APP_DEBUG=false  APP_URL=https://your-domain
#             MONEY_AMR_PASSWORD=…  MONEY_SAKINA_PASSWORD=…   ( before the seed )
touch database/database.sqlite   # or use MySQL / PostgreSQL: set the DB_* values in .env
php artisan migrate --force && php artisan db:seed --force
```

If your host's document root is the `backend/` folder itself and cannot be changed, keep the `backend/.htaccess` file ( Apache ):
it hands every request to `public/` and hides everything else ( `.env`, `app/`, `vendor/`, `storage/` … ).

`storage/` and `bootstrap/cache/` must be writable by the web server; with SQLite, so must `database/` and `database.sqlite`.
Laravel answers `/api/*`; any other page that is not a file in `backend/public` gets the frontend's `index.html`.
Run `php artisan optimize` after each deploy.

## Data

Everything is in the database ( SQLite by default: `backend/database/database.sqlite`; back it up by copying the file ).
Tables: `users`, `categories`, `transactions`, `groceries`, `personal_access_tokens` ( the sign-in tokens, 30 days ).
The passwords are stored hashed ( bcrypt ). Sign-in is rate limited ( 10 tries a minute ).

Coming from the old JSON version ( `data/amr.json`, `data/sakina.json` )? After `migrate --seed`:

```bash
php artisan money:import-json /path/to/data
```

## Pages

| Page | What it does |
| --- | --- |
| Dashboard | The month in four figures ( income, expenses, net, savings rate, each against last month ); income and expenses over the last 12 months; where the money went ( expenses by category, ranked, with % ; a category opens to show its subcategories ); spending pace ( spent so far this month, day by day, against last month ); savings over time; the latest transactions. The arrows change the month. Each chart can be shown as a table |
| Transactions | Search ( note, category, amount ), filters by type, one or more categories ( a category takes its subcategories with it ) and period ( this month, last month, last 3 months, this year, all, custom dates ); totals of what is shown; a table on wide screens, a list by day on phones. Edit and delete; deleting asks first |
| Groceries | A to-buy list with checkboxes. Type a name and press Enter to add ( priority Normal unless you click the chip: High, Normal, Low ). Sort by priority or last added. A ticked item moves to the archive below, faded; unticking it puts it back |
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

## API ( backend/routes/api.php )

| Method | URL | Body | Returns |
| --- | --- | --- | --- |
| POST | `/api/login` | `{ username, password }` | `{ token, user }` |
| GET | `/api/me` · `/api/data` | | the user · `{ settings, categories, transactions, groceries }` |
| POST · PUT · DELETE | `/api/transactions` · `/api/transactions/{id}` | `{ type, amount, categoryId, date, note }` | the transaction |
| POST · PUT · DELETE | `/api/categories` · `/api/categories/{id}` | `{ type, name, color, parentId }` · DELETE `{ moveTo }` | the category ( `parentId`: a subcategory ) |
| POST · PUT · DELETE | `/api/groceries` · `/api/groceries/{id}` | `{ name, priority, done }` ( PUT: any of them ) | the item |
| PUT | `/api/settings` | `{ currency }` | the settings |

Every call but the sign-in needs `Authorization: Bearer <token>` ( Laravel Sanctum ). Errors are `{ "error": "message" }`.
