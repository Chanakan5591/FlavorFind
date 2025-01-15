import { reactRouter } from "@react-router/dev/vite";
import autoprefixer from "autoprefixer";
import { copyFileSync, mkdirSync } from "fs";
import { join } from "path";
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
      buildEnd() {
        // 1. Determine the source path of the Prisma binary
        const prismaClientPath = "node_modules/@prisma/ffdb"; // Update if your Prisma Client is elsewhere
        const binaryName =
          "libquery_engine-rhel-openssl-3.0.x.so.node"; // Update with the correct binary name for Vercel (rhel-openssl-3.0.x in your case)
        const sourcePath = join(
          prismaClientPath,
          binaryName
        );

        // 2. Determine the destination path in Vercel's function directory
        const destinationDir = ".vercel/output/functions/index.func/"; // Make sure this path matches your Vercel setup

        // 3. Create the destination directory if it doesn't exist
        mkdirSync(destinationDir, { recursive: true });

        // 4. Copy the binary file
        const destinationPath = join(destinationDir, binaryName);
        copyFileSync(sourcePath, destinationPath);

        console.log(
          `Copied Prisma binary ${binaryName} to ${destinationPath}`
        );
      },
    },
		reactRouter(),
		tsconfigPaths(),
  ]
}));
