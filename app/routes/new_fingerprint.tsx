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