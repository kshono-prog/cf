/* eslint-disable @typescript-eslint/no-require-imports */
const Module = require("node:module");
const path = require("node:path");

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "server-only") {
    return path.join(process.cwd(), "tests/server-only-stub.cjs");
  }

  if (typeof request === "string" && request.startsWith("@/")) {
    const absolutePath = path.join(process.cwd(), request.slice(2));
    return originalResolveFilename.call(this, absolutePath, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
