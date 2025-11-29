import config from './config.js'
import srpc from './srpc.js'
import { authToken, authData } from './auth.js'
import fs from 'fs/promises'
import { createReadStream } from 'fs'

srpc({}, config.port)
console.log('[LabWeb Grapher] server started at port', config.port)

const P = config.pathMap || (path => path)

srpc.getList = async (token, path) => {
  if (!await authToken(token)) return { ok: false, logout: true, err: 'Permission denied' }
  if (!await authData(path)) return { ok: false, err: 'Permission denied' }
  try {
    const list = (await fs.readdir(P(path))).filter(x => x.match(/\.csv$/) || x.match(/\.dir$/))
    let ini = undefined, yml = undefined
    try { yml = (await fs.readFile(P(path + '/labweb.yml'))).toString() || '' } catch {}
    if (!yml) {
      try { ini = (await fs.readFile(P(path + '/session.ini'))).toString() || '' } catch {}
    }
    return { ok: true, res: list, ini, yml }
  } catch (e) {
    return { ok: false, err: 'Fail to read the directory' }
  }
}

// directory meta information stored as labweb.yml
srpc.writeYML = async (token, path, data) => {
  if (!await authToken(token)) return { ok: false, logout: true, err: 'Permission denied' }
  if (!await authData(path)) return { ok: false, err: 'Permission denied' }
  try {
    await fs.writeFile(P(path + '/labweb.yml'), data)
    return { ok: true }
  } catch (e) {
    return { ok: false, err: 'Fail to read the directory' }
  }
}


function stream2Buffer (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

// Path with no extension
srpc.get = async (token, path, meta = true, lastSize = 0) => {
  if (!await authToken(token)) return { ok: false, logout: true, err: 'Permission denied' }
  if (!await authData(path)) return { ok: false, err: 'Permission denied' }
  try {
    const res = {}
    if (meta) {
      try { res.yml = (await fs.readFile(P(path + '.yml'))).toString() || '' }
      catch { if (!res.yml) res.ini = (await fs.readFile(P(path + '.ini'))).toString() || '' }
    }
    if (lastSize < 0) return { ok: true, res } // not requesting data
    const stream = createReadStream(P(path + '.csv'), { start: lastSize })
    const buffer = await stream2Buffer(stream)
    res.csv = buffer.toString()
    res.size = lastSize + buffer.length - (res.csv.match(/\0/g) || []).length
    res.csv = res.csv.replaceAll('\0', '')
    return { ok: true, res }
  } catch {
    return { ok: false, err: 'Fail to read the file' }
  }
}

srpc.createDir = async (token, path, dirName) => {
  if (!await authToken(token)) return { ok: false, logout: true, err: 'Permission denied' }
  if (!await authData(path)) return { ok: false, err: 'Permission denied' }
  if (!dirName.match(/^[^\/\\\.]+$/)) return { ok: false, err: 'Invalid directory name' }
  try {
    await fs.mkdir(P(path + '/' + dirName + '.dir'))
    return { ok: true }
  } catch {
    return { ok: false, err: 'Fail to read the file' }
  }
}
