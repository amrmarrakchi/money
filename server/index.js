// Production: serves the built app ( dist/ ) and the JSON API on one port. `npm run build && npm start`
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { apiMiddleware } from './api.js'

const DIST = path.resolve('dist')
const PORT = Number(process.env.PORT || 4173)
const HOST = process.env.HOST || '127.0.0.1'
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
}

function serveFile(req, res) {
  const url = decodeURIComponent((req.url || '/').split('?')[0])
  let file = path.join(DIST, path.normalize(url).replace(/^(\.\.[/\\])+/, ''))
  if (!file.startsWith(DIST)) file = path.join(DIST, 'index.html')
  // Any path that is not a file is a page of the app ( /transactions, /categories … )
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream')
  if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  fs.createReadStream(file).pipe(res)
}

http.createServer((req, res) => apiMiddleware(req, res, () => serveFile(req, res)))
  .listen(PORT, HOST, () => console.log(`Money is running on http://${HOST}:${PORT}`))
