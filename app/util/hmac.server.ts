import crypto from 'crypto'
import { env } from '~/env'

const HSK = env.HMAC_SECRET_KEY

function generateNonce() {
    return crypto.randomBytes(16).toString('hex')
}

function generateHMAC(fingerprintId: string, nonce: string) {
    let hmac = crypto.createHmac('sha256', HSK)
    hmac.update(fingerprintId + nonce)
    return hmac.digest('hex')
}

export function generateClientString(fingerprintId: string) {
    const nonce = generateNonce()
    return fingerprintId + ':' + generateHMAC(fingerprintId, nonce) + ':' + nonce
}

function verifyHmac(fingerprintId: string, nonce: string, clientHmac: string): boolean {
    const expectedHmac = generateHMAC(fingerprintId, nonce);
    // Use a timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedHmac, 'hex'),
      Buffer.from(clientHmac, 'hex')
    );
  }

export function verifyClientString(clientString: string): boolean {
    const [fingerprintId, clientHmac, nonce] = clientString.split(':');
    if (!fingerprintId || !clientHmac || !nonce) return false; // Validate format
  
    // Generate expected HMAC and verify
    return verifyHmac(fingerprintId, nonce, clientHmac);
  }