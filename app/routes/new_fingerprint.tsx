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
import { generateClientString } from "~/util/hmac.server";
import type { Route } from "./+types/new_fingerprint";

export async function action({
    request
}: Route.ActionArgs) {
    const formData = await request.formData()
    let fingerprint = formData.get("fingerprint")

    fingerprint = fingerprint as string

    const hmac = generateClientString(fingerprint)
    // fingerprint:hmac:nonce

    return { hmac }
}

// return page that will redirect to /
export default function NewFingerprint() {
    return (
        <html>
            <head>
                <meta httpEquiv="refresh" content="0;url=/" />
            </head>
        </html>
    )
}