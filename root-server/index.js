import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)



import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import crypto from 'crypto'
import fs from 'fs'

// 定义基础信息
const app = express()
const PORT = 4000
const SERVERS_FILE = './root-server/servers.json'

app.use(cors())
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'views')))

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex')
}
function sha384(input) {
  return crypto.createHash('sha384').update(input).digest('hex')
}

function loadJson(file) {
  if (!fs.existsSync(file)) return {}
  const content = fs.readFileSync(file, 'utf-8').trim()
  if (!content) return {}
  try {
    return JSON.parse(content)
  } catch (e) {
    console.error(`❌ 解析 ${file} 失败：`, e.message)
    return {}
  }
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}


// 创建密钥和sid
let counter = 0
app.post('/registerkey', (req, res) => {
  const date = new Date()
  const dateCode = `${date.getFullYear() % 100}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}` // yymmdd
  const timeCode = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}` // hhmm
  const serial = counter++
  const raw = dateCode + timeCode + serial
  const skey = md5(raw)
  const sid = sha384(skey).slice(0, 8)

  const servers = fs.existsSync(SERVERS_FILE)
    ? JSON.parse(fs.readFileSync(SERVERS_FILE))
    : {}

  servers[sid] = { sip: '', skey, status: '' }
  fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2))

  res.json({ sid, skey })
})

// 提供网页
app.get('/dashboard/registerkey', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/registerkey.html'))
})

app.listen(PORT, () => {
  console.log(`🌐 Root server running at http://localhost:${PORT}`)
})

app.post('/server-online', (req, res) => {
  const { sid } = req.body
  const servers = loadJson(SERVERS_FILE)
  if (!servers[sid]) {
    return res.status(400).json({ error: '未注册的服务器 ID' })
  }

  servers[sid].status = 'online'
  servers[sid].lastSeen = new Date().toISOString()
  save(SERVERS_FILE, servers)

  res.json({ message: '状态已更新为在线' })
})

setInterval(async () => {
  const servers = loadJson(SERVERS_FILE)
  for (const [sid, { sip }] of Object.entries(servers)) {
    if (!sip) continue
    try {
      const res = await fetch(`${sip}/ping`)
      const text = await res.text()
      if (text === 'pong') {
        servers[sid].status = 'online'
        servers[sid].lastSeen = new Date().toISOString()
      } else {
        servers[sid].status = 'offline'
      }
    } catch {
      servers[sid].status = 'offline'
    }
  }
  save(SERVERS_FILE, servers)
  console.log('🔄 已轮询所有服务器状态')
}, 30_000)
