// The JSON API of Money: users, their categories and their transactions, one JSON file per user in data/.
// Used by the Vite dev server ( vite.config.ts ) and by server/index.js in production. No dependencies.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.resolve(process.env.MONEY_DATA_DIR || 'data')
const TOKEN_DAYS = 30

// The two accounts. Only a salted hash of the password is kept ( the password is 1234 for both )
const USERS = {
  amr: { name: 'Amr', salt: 'd2f7c1a9e04b3c58', hash: '' },
  sakina: { name: 'Sakina', salt: '8b41e6d0a7f2c935', hash: '' },
}
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 32).toString('hex')
for (const u of Object.values(USERS)) u.hash = hashPassword('1234', u.salt)

const DEFAULT_CATEGORIES = [
  ['expense', 'Groceries', '#16a34a'], ['expense', 'Rent', '#4a3aa7'], ['expense', 'Bills & utilities', '#2a78d6'],
  ['expense', 'Transport', '#eb6834'], ['expense', 'Eating out', '#e87ba4'], ['expense', 'Health', '#e34948'],
  ['expense', 'Shopping', '#eda100'], ['expense', 'Leisure', '#1baf7a'], ['expense', 'Other', '#71717a'],
  ['income', 'Salary', '#16a34a'], ['income', 'Freelance', '#2a78d6'], ['income', 'Gifts', '#e87ba4'], ['income', 'Other', '#71717a'],
]

// ---------------------------------------------------------------- files
function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function secret() {
  ensureDir()
  const file = path.join(DATA_DIR, '.secret')
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 })
  return fs.readFileSync(file, 'utf8').trim()
}

function userFile(user) {
  return path.join(DATA_DIR, `${user}.json`)
}

function load(user) {
  ensureDir()
  const file = userFile(user)
  if (!fs.existsSync(file)) {
    const data = {
      settings: { currency: 'MAD' },
      categories: DEFAULT_CATEGORIES.map(([type, name, color]) => ({ id: newId(), type, name, color })),
      transactions: [],
    }
    save(user, data)
    return data
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

// Written to a temporary file, then renamed: a crash never leaves half a file
function save(user, data) {
  ensureDir()
  const file = userFile(user)
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}

function newId() {
  return crypto.randomUUID()
}

// ---------------------------------------------------------------- tokens: user.expiry.signature
function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

function makeToken(user) {
  const payload = `${user}.${Date.now() + TOKEN_DAYS * 864e5}`
  return `${payload}.${sign(payload)}`
}

function readToken(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const [user, expiry, signature] = token.split('.')
  if (!user || !expiry || !signature || !USERS[user]) return null
  const expected = sign(`${user}.${expiry}`)
  const ok = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  return ok && Number(expiry) > Date.now() ? user : null
}

// ---------------------------------------------------------------- validation
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const COLOR = /^#[0-9a-f]{6}$/i

function cleanTransaction(body, data) {
  const type = body.type
  if (type !== 'expense' && type !== 'income') throw new HttpError(400, 'Type must be expense or income')
  const amount = Math.round(Number(body.amount) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'The amount must be more than 0')
  const category = data.categories.find(c => c.id === body.categoryId)
  if (!category || category.type !== type) throw new HttpError(400, 'Choose a category')
  if (!DATE.test(String(body.date)) || Number.isNaN(Date.parse(body.date))) throw new HttpError(400, 'Choose a date')
  return { type, amount, categoryId: category.id, date: body.date, note: String(body.note || '').trim().slice(0, 200) }
}

function cleanCategory(body, data, id) {
  const type = body.type
  if (type !== 'expense' && type !== 'income') throw new HttpError(400, 'Type must be expense or income')
  const name = String(body.name || '').trim().slice(0, 40)
  if (!name) throw new HttpError(400, 'Enter a name')
  if (data.categories.some(c => c.id !== id && c.type === type && c.name.toLowerCase() === name.toLowerCase()))
    throw new HttpError(409, `There is already an ${type} category called ${name}`)
  const color = COLOR.test(String(body.color)) ? body.color : '#71717a'
  return { type, name, color }
}

// ---------------------------------------------------------------- routes
function route(method, url, user, body) {
  if (method === 'POST' && url === '/api/login') {
    const username = String(body.username || '').trim().toLowerCase()
    const account = USERS[username]
    const given = hashPassword(String(body.password || ''), account ? account.salt : 'none')
    if (!account || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(account.hash)))
      throw new HttpError(401, 'Wrong username or password')
    return { token: makeToken(username), user: { username, name: account.name } }
  }

  if (!user) throw new HttpError(401, 'Please sign in')
  const data = load(user)
  const [, , resource, id] = url.split('/')

  if (method === 'GET' && url === '/api/me') return { username: user, name: USERS[user].name }
  if (method === 'GET' && url === '/api/data') return data

  if (resource === 'settings' && method === 'PUT') {
    const currency = String(body.currency || '').trim().slice(0, 8)
    if (!currency) throw new HttpError(400, 'Enter a currency')
    data.settings = { ...data.settings, currency }
    save(user, data)
    return data.settings
  }

  if (resource === 'transactions') {
    if (method === 'POST' && !id) {
      const t = { id: newId(), ...cleanTransaction(body, data), createdAt: new Date().toISOString() }
      data.transactions.push(t)
      save(user, data)
      return t
    }
    const index = data.transactions.findIndex(t => t.id === id)
    if (index < 0) throw new HttpError(404, 'This transaction no longer exists')
    if (method === 'PUT') {
      data.transactions[index] = { ...data.transactions[index], ...cleanTransaction(body, data), updatedAt: new Date().toISOString() }
      save(user, data)
      return data.transactions[index]
    }
    if (method === 'DELETE') {
      data.transactions.splice(index, 1)
      save(user, data)
      return { deleted: id }
    }
  }

  if (resource === 'categories') {
    if (method === 'POST' && !id) {
      const c = { id: newId(), ...cleanCategory(body, data) }
      data.categories.push(c)
      save(user, data)
      return c
    }
    const index = data.categories.findIndex(c => c.id === id)
    if (index < 0) throw new HttpError(404, 'This category no longer exists')
    const used = data.transactions.filter(t => t.categoryId === id).length
    if (method === 'PUT') {
      const next = cleanCategory(body, data, id)
      if (used && next.type !== data.categories[index].type)
        throw new HttpError(409, 'This category has transactions: its type cannot change')
      data.categories[index] = { ...data.categories[index], ...next }
      save(user, data)
      return data.categories[index]
    }
    if (method === 'DELETE') {
      // Its transactions can move to another category of the same type, else the category must be empty
      if (used) {
        const target = data.categories.find(c => c.id === body.moveTo && c.id !== id && c.type === data.categories[index].type)
        if (!target) throw new HttpError(409, `This category has ${used} transaction${used > 1 ? 's' : ''}: choose where to move them`)
        for (const t of data.transactions) if (t.categoryId === id) t.categoryId = target.id
      }
      data.categories.splice(index, 1)
      save(user, data)
      return { deleted: id }
    }
  }

  throw new HttpError(404, 'Not found')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1e6) reject(new HttpError(413, 'Too large'))
    })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) }
      catch { reject(new HttpError(400, 'Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

// Connect-style middleware: answers /api/*, passes everything else on
export async function apiMiddleware(req, res, next) {
  const url = (req.url || '').split('?')[0]
  if (!url.startsWith('/api/')) return next()
  try {
    const body = ['POST', 'PUT', 'DELETE'].includes(req.method) ? await readBody(req) : {}
    send(res, 200, route(req.method, url, readToken(req), body))
  }
  catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    if (status === 500) console.error(e)
    send(res, status, { error: status === 500 ? 'Something went wrong' : e.message })
  }
}
