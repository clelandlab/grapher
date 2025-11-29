import config from './config.js'
import crypto from 'crypto'
import fs from 'fs'

const random = (l = 32) => crypto.randomBytes(l).toString('base64url')
const _token = random()
fs.writeFileSync(config.tokenPath + '/token.txt', _token)
console.log('[LabWeb Grapher] token generated at tokenPath.')

export async function authToken (token) {
  return token === _token
}

export async function authData (path) {
  return (path.indexOf(config.dataPrefix) === 0 && !path.includes('..'))
}

