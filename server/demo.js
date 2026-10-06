// Fills an account with 6 months of example transactions, to try the app: npm run demo -- amr
// Refuses an account that already has transactions.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.resolve(process.env.MONEY_DATA_DIR || 'data')
const user = process.argv[2]
if (!['amr', 'sakina'].includes(user)) {
  console.error('Usage: npm run demo -- amr   ( or sakina )')
  process.exit(1)
}
const file = path.join(DATA_DIR, `${user}.json`)
if (fs.existsSync(file) && JSON.parse(fs.readFileSync(file, 'utf8')).transactions.length) {
  console.error(`${user} already has transactions: nothing changed.`)
  process.exit(1)
}

const cat = (type, name, color) => ({ id: crypto.randomUUID(), type, name, color })
const categories = [
  cat('expense', 'Groceries', '#16a34a'), cat('expense', 'Rent', '#4a3aa7'), cat('expense', 'Bills & utilities', '#2a78d6'),
  cat('expense', 'Transport', '#eb6834'), cat('expense', 'Eating out', '#e87ba4'), cat('expense', 'Health', '#e34948'),
  cat('expense', 'Shopping', '#eda100'), cat('expense', 'Leisure', '#1baf7a'), cat('expense', 'Other', '#71717a'),
  cat('income', 'Salary', '#16a34a'), cat('income', 'Freelance', '#2a78d6'), cat('income', 'Gifts', '#e87ba4'), cat('income', 'Other', '#71717a'),
]
const id = name => categories.find(c => c.name === name).id
const incomeId = name => categories.find(c => c.name === name && c.type === 'income').id

let seed = 7
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const pick = list => list[Math.floor(rand() * list.length)]
const pad = n => String(n).padStart(2, '0')

const transactions = []
const add = (type, amount, categoryId, date, note = '') =>
  transactions.push({ id: crypto.randomUUID(), type, amount: Math.round(amount * 100) / 100, categoryId, date, note, createdAt: `${date}T12:00:00.000Z` })

const now = new Date()
for (let back = 5; back >= 0; back--) {
  const first = new Date(now.getFullYear(), now.getMonth() - back, 1)
  const y = first.getFullYear()
  const m = first.getMonth() + 1
  const days = back === 0 ? now.getDate() : new Date(y, m, 0).getDate()
  const d = day => `${y}-${pad(m)}-${pad(Math.min(day, days))}`
  add('income', 14500, incomeId('Salary'), d(1), 'Monthly salary')
  if (rand() < 0.5) add('income', 1500 + rand() * 3000, incomeId('Freelance'), d(12 + Math.floor(rand() * 10)), 'Website project')
  add('expense', 4200, id('Rent'), d(2), 'Apartment')
  add('expense', 380 + rand() * 260, id('Bills & utilities'), d(6), 'Electricity and water')
  add('expense', 249, id('Bills & utilities'), d(9), 'Internet')
  for (let day = 1; day <= days; day++) {
    if (rand() < 0.45) add('expense', 60 + rand() * 340, id('Groceries'), d(day), pick(['Marjane', 'Carrefour', 'Market', 'Bakery']))
    if (rand() < 0.3) add('expense', 15 + rand() * 60, id('Transport'), d(day), pick(['Taxi', 'Fuel', 'Tram']))
    if (rand() < 0.15) add('expense', 80 + rand() * 260, id('Eating out'), d(day), pick(['Lunch', 'Dinner with friends', 'Coffee']))
    if (rand() < 0.05) add('expense', 150 + rand() * 900, id('Shopping'), d(day), pick(['Clothes', 'Shoes', 'Home']))
    if (rand() < 0.04) add('expense', 100 + rand() * 500, id('Leisure'), d(day), pick(['Cinema', 'Gym', 'Weekend trip']))
    if (rand() < 0.02) add('expense', 200 + rand() * 600, id('Health'), d(day), pick(['Pharmacy', 'Doctor']))
  }
}

fs.mkdirSync(DATA_DIR, { recursive: true })
fs.writeFileSync(file, JSON.stringify({ settings: { currency: 'MAD' }, categories, transactions }, null, 2))
console.log(`${user}: ${transactions.length} example transactions written to ${file}`)
