import { generateClientString } from "~/util/hmac.server";
import type { Route } from "./+types/new_fingerprint";

export async function action({
    request
}: Route.ActionArgs) {
    let formData = await request.formData()
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