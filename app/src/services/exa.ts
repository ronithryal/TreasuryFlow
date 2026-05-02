export interface ExaResult {
  title: string;
  url: string;
  highlights?: string[];
  score?: number;
}

export interface ExaSearchResponse {
  results: ExaResult[];
}

export async function exaSearch(query: string, numResults = 5): Promise<ExaResult[]> {
  const res = await fetch("/api/exa-search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, numResults }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Exa search failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as ExaSearchResponse;
  return json.results ?? [];
}
