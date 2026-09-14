// Allows ts-node to run the Prisma generated client directly.
//
// The generated client (moduleFormat = "cjs") imports sibling files using
// ".js" specifiers (e.g. "./internal/class.js") even though only ".ts" files
// exist in source. Those specifiers resolve after compilation, so ts-node needs
// help mapping them back to the TypeScript sources at development time.
const Module = require('node:module');
const fs = require('node:fs');
const { dirname, resolve } = require('node:path');

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveTsFromJs(
  request,
  parent,
  isMain,
  options,
) {
  if (
    typeof request === 'string' &&
    request.endsWith('.js') &&
    (request.startsWith('./') || request.startsWith('../'))
  ) {
    const parentDirectory =
      parent && parent.filename ? dirname(parent.filename) : process.cwd();
    const candidate = resolve(parentDirectory, `${request.slice(0, -3)}.ts`);
    if (fs.existsSync(candidate)) {
      request = `${request.slice(0, -3)}.ts`;
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
