import { reactRouter } from "@react-router/dev/vite";
import autoprefixer from "autoprefixer";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild, command }) => ({
	build: {
		rollupOptions: isSsrBuild
			? {
				input: "./server/app.ts",
			}
				: undefined
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
		}
	],
	resolve: {
		alias: {
			"@prisma/client": "@prisma/client/index.js",
		}
	}
}));
