import { useEffect } from "react";
import { env } from "./env/client";

export function Posthog() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("posthog-js")
        .then(({ default: posthog }) => {
          if (!posthog.__loaded) {
            posthog.init(env.VITE_POSTHOG_KEY, {
              api_host: "https://us.i.posthog.com",
              person_profiles: "always",
            });
          }
        })
        .catch(console.error);
    }
  }, []);

  return null;
}
