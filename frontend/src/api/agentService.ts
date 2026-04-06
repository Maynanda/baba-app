/**
 * api/agentService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Service for AI Agent operations (drafting, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import apiClient from './client';

interface DraftResponse {
  status: string;
  message: string;
  data: {
    id: string;
    content_name?: string;
    caption?: string;
    platforms?: string[];
    niche?: string;
    slides_data?: Record<string, string>;
    [key: string]: any;
  };
}

/** POST /api/agent/draft — create an AI-powered content draft */
export const createAiDraft = async (
  rawIds: string | string[], 
  templateId: string = "carousel_dark_1x1"
): Promise<any> => {
  const ids = Array.isArray(rawIds) ? rawIds : [rawIds];
  const resp = await apiClient.post<DraftResponse>('/agent/draft', {
    raw_ids: ids,
    template_id: templateId
  });
  return resp.data.data;
};
