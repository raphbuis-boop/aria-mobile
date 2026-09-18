export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Replace this file with `pnpm supabase:types` after the local database is running. */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Functions: {
      match_client_memories: {
        Args: {
          query_embedding: number[];
          match_lead_id: string;
          match_count?: number;
          match_threshold?: number;
        };
        Returns: Array<{
          id: string;
          lead_id: string;
          kind: string;
          content: string;
          importance: number;
          similarity: number;
        }>;
      };
    };
    Enums: Record<string, never>;
  };
};
