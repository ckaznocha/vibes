import eslint from "@eslint/js";
import nx from "@nx/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { flatConfigs as importXFlatConfigs } from "eslint-plugin-import-x";
import nPlugin from "eslint-plugin-n";
import perfectionist from "eslint-plugin-perfectionist";
import promisePlugin from "eslint-plugin-promise";
import regexpPlugin from "eslint-plugin-regexp";
import securityPlugin from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import jsoncParser from "jsonc-eslint-parser";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**"],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  unicorn.configs.recommended,
  sonarjs.configs.recommended,
  regexpPlugin.configs.recommended,
  securityPlugin.configs.recommended,
  nPlugin.configs["flat/recommended-module"],
  promisePlugin.configs["flat/recommended"],
  importXFlatConfigs.recommended,
  importXFlatConfigs.typescript,
  perfectionist.configs["recommended-natural"],
  {
    plugins: { "@nx": nx },
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          allow: [],
          depConstraints: [
            {
              onlyDependOnLibsWithTags: [
                "scope:gen-readme-table",
                "scope:shared",
              ],
              sourceTag: "scope:gen-readme-table",
            },
            {
              onlyDependOnLibsWithTags: [
                "scope:letterboxd-mcp",
                "scope:shared",
              ],
              sourceTag: "scope:letterboxd-mcp",
            },
            {
              onlyDependOnLibsWithTags: ["scope:alamo-mcp", "scope:shared"],
              sourceTag: "scope:alamo-mcp",
            },
            {
              onlyDependOnLibsWithTags: ["scope:tmdb-mcp", "scope:shared"],
              sourceTag: "scope:tmdb-mcp",
            },
            {
              onlyDependOnLibsWithTags: ["scope:honcho-mcp", "scope:shared"],
              sourceTag: "scope:honcho-mcp",
            },
            {
              onlyDependOnLibsWithTags: ["scope:shared"],
              sourceTag: "scope:shared",
            },
            {
              onlyDependOnLibsWithTags: ["type:app", "type:lib"],
              sourceTag: "type:app",
            },
            {
              onlyDependOnLibsWithTags: ["type:mcp-server", "type:lib"],
              sourceTag: "type:mcp-server",
            },
          ],
          enforceBuildableLibDependency: true,
        },
      ],
    },
  },
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        // projectService discovers each file's nearest tsconfig on demand (same mechanism as
        // IDEs) rather than eagerly loading every apps/*/tsconfig.spec.json up front, so it
        // covers both src and test files per project without the "multiple projects" perf
        // warning a static `project: [...]` glob array triggers.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Test files import only their module under test plus test-runner builtins; no default-export convention to enforce.
      "import-x/no-named-as-default-member": "off",
      // perfectionist owns import/export ordering; import-x's own ordering rule would fight it.
      "import-x/order": "off",
      // Fields such as letterboxd-mcp's year/tmdbId and alamo-mcp's Seat.x/y, NormalizedSession
      // fields are deliberately `T | null`, not `T | undefined`: these values are
      // JSON.stringify'd into the MCP tool response, and an `undefined` field vanishes from
      // that output entirely while `null` survives as an explicit "resolved: no value" signal.
      // That's a real wire-contract difference, not a style preference unicorn should override.
      "unicorn/no-null": "off",
    },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          // The root tsconfig.json already references every project's tsconfig.json (which in
          // turn references its own tsconfig.spec.json), so pointing at it directly lets the
          // resolver walk that single reference graph instead of globbing every project's
          // tsconfig.spec.json as separate, unrelated projects.
          tsconfig: {
            configFile: "./tsconfig.json",
            references: "auto",
          },
        }),
      ],
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      // Stub callbacks like `sleepImpl: async () => {}` are deliberate no-ops.
      "@typescript-eslint/no-empty-function": "off",
      // node:test's `it`/`describe`/`test` return a Promise the test runner itself awaits;
      // nothing in this codebase is meant to await them at the call site.
      "@typescript-eslint/no-floating-promises": "off",
      // Mock implementations are declared `async` to satisfy an async signature (e.g. fetch)
      // even when the specific mock body has nothing to await.
      "@typescript-eslint/require-await": "off",
      // Test/dev tooling only used in test files, correctly not a runtime dependency.
      "import-x/no-extraneous-dependencies": [
        "error",
        { devDependencies: true },
      ],
      // Fixture filenames are fixed literals joined under a controlled test-fixtures directory,
      // never user input.
      "security/detect-non-literal-fs-filename": "off",
      // `ok` here is the Fetch API's Response#ok field, mocked verbatim - not a name we choose.
      "unicorn/consistent-boolean-name": "off",
    },
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ["eslint.config.ts"],
  },
  {
    // Catches a publish:npm project's package.json drifting from what its src/ actually
    // imports (missing/obsolete/mismatched-version deps) — see the dependency-reviewer
    // agent, which does the same check by hand for anything this rule can't reach.
    extends: [tseslint.configs.disableTypeChecked],
    files: ["apps/*/package.json", "libs/*/package.json"],
    languageOptions: {
      parser: jsoncParser,
    },
    rules: {
      // The rule only counts a workspace dependency (e.g. an app depending on a
      // libs/* package) if that *dependency* also has a target named in
      // `buildTargets` — libs/* projects intentionally have no "build" target (no
      // separate build step; consuming apps' esbuild bundlers read lib source
      // directly), so the default `buildTargets: ['build']` would make every
      // app-on-lib dependency look unused/obsolete. Every project here (apps and
      // libs alike) does have "typecheck", whose input globs cover the same
      // source files, so use that instead.
      "@nx/dependency-checks": ["error", { buildTargets: ["typecheck"] }],
    },
  },
  {
    files: ["**/src/main.ts"],
    rules: {
      // eslint-import-resolver-typescript can't follow @modelcontextprotocol/sdk's wildcard
      // `"./*"` package.json exports entry (a known limitation, not a real unresolved import -
      // tsc itself, and thus every typed-linting rule above, resolves and type-checks these
      // imports correctly).
      "import-x/no-unresolved": "off",
    },
  },
  eslintConfigPrettier,
);
