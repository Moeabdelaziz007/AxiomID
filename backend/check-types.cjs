const ts = require("typescript");
const fs = require("fs");

const files = [
  "backend/src/routes/email.ts",
  "backend/src/lib/types.ts",
  "backend/src/router.ts",
  "backend/src/lib/auth.ts",
  "backend/src/lib/utils.ts",
  "backend/src/db/kv.ts",
  "backend/src/db/d1.ts",
  "backend/src/lib/rate-limiter.ts",
  "backend/src/lib/trust.ts",
  "backend/src/routes/skills.ts",
  "backend/src/routes/agent-dispatch.ts",
  "backend/src/mcp/handler.ts",
  "backend/src/routes/search.ts",
  "backend/src/routes/truth-rag.ts",
  "backend/src/routes/github-webhook.ts",
  "backend/src/vectors/trust-embedder.ts",
  "backend/src/routes/did.ts",
  "backend/src/routes/vc.ts",
  "backend/src/workers/harvest-processor.ts"
];

const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  resolveJsonModule: true,
  allowSyntheticDefaultImports: true,
  types: ["@cloudflare/workers-types"],
  baseUrl: ".",
};

const program = ts.createProgram(files, compilerOptions);
const diagnostics = ts.getPreEmitDiagnostics(program);

if (diagnostics.length === 0) {
  console.log("PASS: no type errors");
} else {
  for (const d of diagnostics) {
    const f = d.file ? d.file.fileName : "unknown";
    const pos = d.file ? d.file.getLineAndCharacterOfPosition(d.start || 0) : {line:0,char:0};
    console.log(`ERROR ${f}(${pos.line+1},${pos.char+1}): ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
  }
  console.log(diagnostics.length + " error(s)");
}
