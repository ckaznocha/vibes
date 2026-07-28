export interface ProjectRow {
  description: string;
  kind: "app" | "lib";
  name: string;
  root: string;
}

export function buildTable(projects: readonly ProjectRow[]): string {
  const header = "| Project | Kind | Description |\n| --- | --- | --- |";
  const rows = projects.map((project) => toRow(project)).join("\n");
  return `${header}\n${rows}`;
}

export function toRow(project: ProjectRow): string {
  const link = `[\`${project.name}\`](${project.root})`;
  return `| ${link} | ${project.kind} | ${project.description} |`;
}
