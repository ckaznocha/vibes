import type { Conclusion } from "@honcho-ai/sdk";

export interface ConclusionsClient {
  create(parameters: { content: string }): Promise<Conclusion[]>;
  delete(conclusionId: string): Promise<void>;
  list(options: { page?: number; size?: number }): Promise<{
    items: Conclusion[];
    page: number;
    pages: number;
    total: number;
  }>;
}

export interface ConclusionSummary {
  content: string;
  createdAt: string;
  id: string;
}

export async function createConclusion(
  scope: ConclusionsClient,
  content: string,
): Promise<ConclusionSummary> {
  const [conclusion] = await scope.create({ content });
  if (!conclusion) {
    throw new Error("Honcho did not return a created conclusion.");
  }
  return toSummary(conclusion);
}

export function deleteConclusion(
  scope: ConclusionsClient,
  conclusionId: string,
): Promise<void> {
  return scope.delete(conclusionId);
}

export async function listConclusions(
  scope: ConclusionsClient,
  page = 1,
  size = 20,
): Promise<{
  items: ConclusionSummary[];
  page: number;
  pages: number;
  total: number;
}> {
  const result = await scope.list({ page, size: Math.min(size, 100) });
  return {
    items: result.items.map((conclusion) => toSummary(conclusion)),
    page: result.page,
    pages: result.pages,
    total: result.total,
  };
}

function toSummary(conclusion: Conclusion): ConclusionSummary {
  return {
    content: conclusion.content,
    createdAt: conclusion.createdAt,
    id: conclusion.id,
  };
}
