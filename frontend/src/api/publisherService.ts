/**
 * api/publisherService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend interface for Phase 10: Publisher Assistant API.
 * This triggers the backend browser automation scripts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import apiClient from './client';

export interface PushResponse {
  status: string;
  message: string;
  post_id: string;
  platform: string;
}

/** 
 * Trigger the 'Desktop Assistant' (Playwright) to open and post.
 * This is non-blocking — the backend will return a 'started' status.
 */
export const pushToAssistant = async (platform: string, postId: string): Promise<PushResponse> => {
  const res = await apiClient.post<PushResponse>(`/publisher/push/${platform}/${postId}`);
  return res.data;
};
