import { embed } from "ai";
import { env } from "@/lib/env";

export async function embedText(value: string): Promise<number[]> {
  const apiKey = env.openaiApiKey();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for pgvector embeddings. Claude does not expose an embedding API.",
    );
  }

  const { embedding } = await embed({
    model: env.embeddingModel(),
    value,
  });

  return embedding;
}
