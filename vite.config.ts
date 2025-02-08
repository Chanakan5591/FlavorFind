import { reactRouter } from "@react-router/dev/vite";
import autoprefixer from "autoprefixer";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { sentryVitePlugin } from '@sentry/vite-plugin'
import babel from 'vite-plugin-babel'

const ReactCompilerConfig = {
  target: '19' // '17' | '18' | '19'
};

export default defineConfig(({ isSsrBuild, command }) => ({
  optimizeDeps: {
    exclude: ["brotli-wasm", "brotli-wasm/pkg.bundler/brotli_wasm_bg.wasm"],
  },
  build: {
    sourcemap: true,
    rollupOptions: isSsrBuild
      ? {
        input: "./server/app.ts",
      }
      : undefined,
  },
  css: {
    postcss: {
      plugins: [autoprefixer],
    },
  },
  ssr: {
    noExternal: command === "build" ? true : undefined,
  },
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    babel({
      filter: /\.[jt]sx?$/,
      babelConfig: {
        presets: ["@babel/preset-typescript"],
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig]
        ]
      }
    }),
    {
      name: "prisma:build",
      apply: "build",
      config() {
        return {
          define: {
            __dirname: "import.meta.dirname",
            __filename: "import.meta.filename",
          },
        };
      },
      transform(code, id) {
        if (id.includes("@prisma/ffdb")) {
          return code.replace('eval("__dirname")', "import.meta.dirname");
        }
      },
    },
    sentryVitePlugin({
      org: "chanakan-mungtin",
      project: "flavorfind",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      sourcemaps: {
        filesToDeleteAfterUpload: '*.js.map'
      }
    })
  ],
  resolve: {
    alias: {
      "@prisma/client": "@prisma/client/index.js",
    },
  },
}));
