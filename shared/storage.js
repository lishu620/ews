import fs from 'fs'

export function load(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}')
  return JSON.parse(fs.readFileSync(file))
}

export function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}
