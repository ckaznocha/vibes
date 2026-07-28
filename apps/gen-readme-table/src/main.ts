// Regenerates the project table in the root README.md from Nx project metadata.
// Run via `pnpm run docs:table` or automatically on pre-commit (see lefthook.yml).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { spliceTable } from "./readme.ts";
import { buildTable, type ProjectRow } from "./table.ts";

const README_PATH = fileURLToPath(
  new URL("../../../README.md", import.meta.url),
);
const TABLE_START = "<!-- projects:table:start -->";
const TABLE_END = "<!-- projects:table:end -->";

interface NxProjectShow {
  metadata?: { description?: string };
  root: string;
  tags: string[];
}

function loadProject(name: string): ProjectRow {
  const project = nxShowProject(name);
  const packageJsonPath = fileURLToPath(
    new URL(`../../../${project.root}/package.json`, import.meta.url),
  );
  // packageJsonPath is derived from this repo's own tsconfig.json project
  // references (via `nx show project`), not external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    description?: string;
  };
  return {
    description: project.metadata?.description ?? packageJson.description ?? "",
    kind: project.tags.includes("type:app") ? "app" : "lib",
    name,
    root: project.root,
  };
}

function main(): void {
  const names = nxShowProjects();
  const projects = names
    .map((name) => loadProject(name))
    .toSorted((a, b) => {
      if (a.kind !== b.kind) return a.kind === "app" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const table = buildTable(projects);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- README_PATH is a fixed module-level constant.
  const readme = readFileSync(README_PATH, "utf8");
  const updated = spliceTable(readme, table, TABLE_START, TABLE_END);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- README_PATH is a fixed module-level constant.
  writeFileSync(README_PATH, updated);

  // eslint-disable-next-line sonarjs/no-os-command-from-path
  execFileSync("pnpm", ["exec", "prettier", "--write", README_PATH], {
    stdio: "inherit",
  });
}

function nxShowProject(name: string): NxProjectShow {
  return JSON.parse(
    // "pnpm" is this workspace's pinned package manager (package.json's
    // packageManager field); resolving it via PATH is the same trust
    // boundary every `pnpm exec ...` invocation in this repo's tooling
    // (lefthook.yml, package.json scripts) already relies on.
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    execFileSync("pnpm", ["exec", "nx", "show", "project", name, "--json"], {
      encoding: "utf8",
    }),
  ) as NxProjectShow;
}

function nxShowProjects(): string[] {
  return JSON.parse(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- see nxShowProject above.
    execFileSync("pnpm", ["exec", "nx", "show", "projects", "--json"], {
      encoding: "utf8",
    }),
  ) as string[];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
