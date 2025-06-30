import express from 'express'
import fs from 'fs'
import axios from 'axios'
import bodyParser from 'body-parser'


const app = express()
app.use(bodyParser.json())

const ESK_FILE = './server-a/auth.esk'
const SERVER_FILE = './server-a/server.json'

const config = JSON.parse(fs.readFileSync(ESK_FILE))
const rootServer = 'http://localhost:4000'

async function registerToRoot() {
  const { skey, sip, sname } = config
  const servers = JSON.parse(fs.readFileSync('./root-server/servers.json'))
  const sid = Object.keys(servers).find(k => servers[k].skey === skey)

  if (!sid) {
    console.error('❌ 无效密钥，注册失败')
    return
  }

  servers[sid].sip = sip
  servers[sid].status = 'unknown'
  fs.writeFileSync('./root-server/servers.json', JSON.stringify(servers, null, 2))

  const serverInfo = { sid, sip, skey }
  fs.writeFileSync(SERVER_FILE, JSON.stringify(serverInfo, null, 2))
  console.log(`✅ 辅助服务器已注册：${sid}`)
}

// 1. 监听 ping 请求
app.get('/ping', (req, res) => {
  res.send('pong')
})

// 2. 启动时通知根服务器：我在线了
async function notifyOnline() {
  try {
    await axios.post(`${rootServer}/server-online`, {
      sid: config.sid
    })
    console.log(`📡 已向主服务器报告在线状态：${config.sid}`)
  } catch (err) {
    console.error('❌ 无法通知主服务器在线：', err.message)
  }
}

notifyOnline()
registerToRoot()

// 启动服务器
app.listen(5001, () => {
  console.log('🚀 server-a 业务服务器运行中 http://localhost:5001')
})