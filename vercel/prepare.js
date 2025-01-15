import * as fsp from "node:fs/promises";

await fsp.rm(".vercel", { recursive: true }).catch(() => {});
await fsp.mkdir(".vercel/output/static", { recursive: true });

await fsp.cp("vercel/output/", ".vercel/output", { recursive: true });
await fsp.cp("build/client/", ".vercel/output/static", { recursive: true });
await fsp.cp("build/server/", ".vercel/output/functions/index.func", {
  recursive: true,
});

await fsp.cp("node_modules/@prisma/ffdb/libquery_engine-rhel-openssl-3.0.x.so.node", ".vercel/output/functions/index.func/libquery_engine-rhel-openssl-3.0.x.so.node");
