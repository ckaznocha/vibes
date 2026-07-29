export interface ToolResultError {
  [key: string]: unknown;
  content: ToolTextContent[];
  isError: true;
}

export interface ToolResultOk {
  [key: string]: unknown;
  content: ToolTextContent[];
}

export interface ToolTextContent {
  text: string;
  type: "text";
}

/** Wraps a caught error into the MCP tool-response `content` shape with `isError: true`. */
export function toolError(error: unknown): ToolResultError {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ text: message, type: "text" }], isError: true };
}

/** JSON-serializes `data` into the MCP tool-response `content` shape. */
export function toolResult(data: unknown): ToolResultOk {
  return { content: [{ text: JSON.stringify(data, null, 2), type: "text" }] };
}
// TEMPORARY: forces nx affected to pick up this lib for the Nx Agents CI
// verification run. Revert before merge.
