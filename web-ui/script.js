async function createWallet() {
  const name = document.getElementById('wallet-name').value.trim()
  if (!name) return alert('请输入钱包名称')

  const keyPair = crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true, ["sign", "verify"]
  )

  const key = await keyPair
  const pub = await crypto.subtle.exportKey("jwk", key.publicKey)
  const priv = await crypto.subtle.exportKey("jwk", key.privateKey)

  const wallet = {
    name,
    createdAt: new Date().toISOString(),
    publicKey: pub,
    privateKey: priv
  }

  const blob = new Blob([JSON.stringify(wallet, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${name}.emo`
  link.click()
  output('✅ 已生成 .emo 钱包文件')
}

async function registerWallet() {
  const fileInput = document.getElementById('emo-file')
  if (fileInput.files.length === 0) return alert('请选择 .emo 文件')

  const file = fileInput.files[0]
  const content = await file.text()
  const wallet = JSON.parse(content)

  const res = await fetch('http://localhost:5001/register-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletName: wallet.name,
      publicKey: wallet.publicKey
    })
  })

  const data = await res.json()
  output(JSON.stringify(data, null, 2))
}

async function queryWallet() {
  const name = document.getElementById('query-name').value.trim()
  if (!name) return alert('请输入钱包名称')

  const res = await fetch(`http://localhost:5001/wallet/${name}`)
  const data = await res.json()
  output(JSON.stringify(data, null, 2))
}

function output(msg) {
  document.getElementById('output').textContent = msg
}
