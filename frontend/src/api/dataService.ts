/**
 * api/dataService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All Data-related API calls in one place.
 * Each function maps 1:1 to a FastAPI endpoint in api/routers/data.py.
 *
 * Rule for agents: Add a new function here for every new data endpoint.
 * Keep all functions pure (no state, no UI side-effects).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import apiClient from './client';
import type { RawContent, Post, DiscoveredLink, ListResponse } from '../types';

/** GET /api/data/raw — all raw scraped items */
export const fetchRawData = async (): Promise<RawContent[]> => {
  const res = await apiClient.get<ListResponse<RawContent>>('/data/raw');
  return res.data.data;
};

/** GET /api/data/content — all content pipeline posts */
export const fetchContentData = async (): Promise<Post[]> => {
  const res = await apiClient.get<ListResponse<Post>>('/data/content');
  return res.data.data;
};

/** GET /api/data/discovered — all portal-discovered links */
export const fetchDiscoveredLinks = async (): Promise<DiscoveredLink[]> => {
  const res = await apiClient.get<ListResponse<DiscoveredLink>>('/data/discovered');
  return res.data.data;
};

/** DELETE /api/data/raw/{id} */
export const deleteRawItem = async (id: string): Promise<void> => {
  await apiClient.delete(`/data/raw/${id}`);
};

/** DELETE /api/data/content/{id} */
export const deletePost = async (id: string): Promise<void> => {
  await apiClient.delete(`/data/content/${id}`);
};
