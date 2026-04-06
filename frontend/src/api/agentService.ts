/**
 * api/agentService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Service for AI Agent operations (drafting, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import apiClient from './client';
import type { Post } from '../types';

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
export const createAiDraft = async (rawId: string, templateId: string = "carousel_dark_1x1") => {
  const res = await apiClient.post<DraftResponse>('/agent/draft', {
    raw_id: rawId,
    template_id: templateId,
  });
  return res.data.data; // Return the inner data object directly
};
