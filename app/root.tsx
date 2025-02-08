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
import * as Sentry from "@sentry/react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "remixicon/fonts/remixicon.css";
import Navbar from "./components/navbar";

import "./global.css";

import { Box, ChakraProvider } from "@chakra-ui/react";
import { Toaster } from "./components/ui/toaster";
import PostHogPageView from "./util/pageview";
import { system } from "theme";
import { Posthog } from "./posthog";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://typefaces.chanakancloud.net" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="cupcake">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body style={{
        margin: 0,
        padding: 0
      }}>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Posthog />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ChakraProvider value={system}>
      <Toaster />
      <Box
        css={{
          width: "100%",
          height: "100svh",
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Navbar />
        <Outlet />
        <PostHogPageView />
      </Box>
    </ChakraProvider>
  );
}

function reportToSentry(error: unknown) {
  if (!import.meta.env.DEV) {
    return Sentry.captureException(error)
  } else return undefined
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let stack: string | undefined;
  let message = "We have a problem :("
  let runtimeError = false;

  if (import.meta.env.DEV) {
    message = "🔥 Chanakan come fix this 🔥"
  }

  let sentid: string | undefined;
  //sentid = 'gh'
  let is404 = false;

  if (error != null) {
    if (isRouteErrorResponse(error)) {
      if (error.status === 404) {
        is404 = true;
        message = "We tried to find what you want, but it's just not there."
      }
      if (!error.status.toString().startsWith('4')) {
        runtimeError = true
        sentid = reportToSentry(error)
      }
    } else {
      runtimeError = true
      sentid = reportToSentry(error)
    }
  }
  if (isRouteErrorResponse(error)) {
  } else if (error && error instanceof Error) {
    if (import.meta.env.DEV) {
      stack = error.stack;
    }
  }

  return (
    <main style={{
      height: "100svh",
      flexDirection: "column",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        fontSize: 24,
        fontWeight: 600
      }}>
        {is404 ? (
          <>
            <span style={{ color: "#007a56" }}>Flavor</span>
            <span style={{ color: "maroon" }}>Not</span>
            <span style={{ color: "#4dc6a7" }}>Foun</span>
            <span style={{ color: "#4dc6a7" }}>
              <span style={{ position: "relative" }}>
                d
                <span
                  style={{
                    content: '""',
                    position: "absolute",
                    bottom: "2px",
                    left: 0,
                    width: "100%",
                    height: "2px",
                    backgroundColor: "#ffad52",
                  }}
                ></span>
              </span>
            </span>
          </>
        ) : (
          <>
            <span style={{ color: "#007a56" }}>Flavor</span>
            <span style={{ color: "maroon" }}>Frie</span>
            <span style={{ color: "maroon" }}>
              <span style={{ position: "relative" }}>
                d
                <span
                  style={{
                    position: "absolute",
                    top: '-1.4rem',
                    left: 0,
                    width: "100%",
                    height: "2px",
                  }}
                >
                  🔥
                </span>
              </span>

            </span>
          </>
        )}
      </div>
      <h1 style={{ textAlign: "center", marginBottom: 0, maxWidth: '24ch' }}>{message}</h1>
      {runtimeError && !import.meta.env.DEV &&
        <>
          <span style={{
            fontSize: 14,
            marginTop: 0,
            marginBottom: 12
          }}>And Chanakan is not happy (he's the dev)</span>

          <img src='/sadbroken.png' width='200' height='200' style={{
            borderRadius: "100%",
            objectFit: "cover"
          }} />
        </>
      }

      {stack && (
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            margin: 8,
            paddingInline: 12,
            borderRadius: "16px",
            background: "#222436",
            color: "#c8d3f5",
          }}>
            <pre style={{
              overflowX: "auto",
            }}>
              <code>{stack}</code>
            </pre>
          </div>
        </div>
      )}

      {sentid &&
        <>
          <span style={{
            marginTop: 16,
            fontWeight: 300,
            fontSize: 14,
            textAlign: 'center'
          }}>Please submit the ID below to our feedback/survey form for quicker resolution.</span>
          <span style={{
            fontSize: 14,
            fontWeight: 600
          }}>Reporting ID: {sentid}</span>
        </>
      }
      <a href='/'>Go Back</a>
      <a href='/survey'>Take a Survey</a>
    </main>
  );
}
