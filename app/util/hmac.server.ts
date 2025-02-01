/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2025 Chanakan Moongthin.
 */
import crypto from "crypto";
import { env } from "~/env/server";

const HSK = env.HMAC_SECRET_KEY;

function generateNonce() {
  return crypto.randomBytes(16).toString("hex");
}

function generateHMAC(fingerprintId: string, nonce: string) {
  let hmac = crypto.createHmac("sha256", HSK);
  hmac.update(fingerprintId + nonce);
  return hmac.digest("hex");
}

export function generateClientString(fingerprintId: string) {
  const nonce = generateNonce();
  return fingerprintId + ":" + generateHMAC(fingerprintId, nonce) + ":" + nonce;
}

function verifyHmac(
  fingerprintId: string,
  nonce: string,
  clientHmac: string,
): boolean {
  const expectedHmac = generateHMAC(fingerprintId, nonce);
  // Use a timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedHmac, "hex"),
    Buffer.from(clientHmac, "hex"),
  );
}

export function verifyClientString(clientString: string): boolean {
  const [fingerprintId, clientHmac, nonce] = clientString.split(":");
  if (!fingerprintId || !clientHmac || !nonce) return false; // Validate format

  // Generate expected HMAC and verify
  return verifyHmac(fingerprintId, nonce, clientHmac);
}
