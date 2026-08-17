import { join } from "node:path";
import { renderCliHelp } from "../packages/cli/src/cli-help.ts";

const root = join(import.meta.dir, "..");
const markdown = `# CLI reference

This page is generated from the installed CLI help. Do not edit it directly.

\`\`\`text
${renderCliHelp().trimEnd()}
\`\`\`

## Runtime dependencies

- Bun 1.3 or newer is required to invoke the published TypeScript CLI.
- Vite is not installed on user machines. The release process builds the report application once and packages its static assets with the CLI.
- Playwright Chromium is required for rendered crawling. Install the package's pinned browser with \`bunx playwright install chromium\` when the executable is not already available. This is dependency setup, not an SEO Audit command.

## Open a report

\`seo-audit open <audit-directory>\` validates the audit and serves the embedded report application at exactly \`http://localhost:4173\`. The command has no port option and exits with an error when port 4173 is unavailable.
`;

await Bun.write(join(root, "docs/CLI.md"), markdown);
console.log("Generated docs/CLI.md");
