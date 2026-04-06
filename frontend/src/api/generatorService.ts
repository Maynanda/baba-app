/**
 * api/generatorService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All Generator-related API calls in one place.
 * Each function maps 1:1 to api/routers/generator.py.
 *
 * Rule for agents: Add a new function here for every new generator endpoint.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import apiClient from './client';
import type { JobResponse } from '../types';

/** GET /api/generator/templates — list all available templates */
export const fetchTemplates = async () => {
  const res = await apiClient.get('/generator/templates');
  return res.data.data as Template[];
};

/** GET /api/generator/templates/{id} — get single template schema with placeholders */
export const fetchTemplate = async (templateId: string): Promise<TemplateDetail> => {
  const res = await apiClient.get(`/generator/templates/${templateId}`);
  return res.data.data;
};

/** POST /api/generator/generate — kick off visual generation job */
export const triggerGenerate = async (
  postId: string,
  templateId: string,
  platform: string,
): Promise<JobResponse> => {
  const res = await apiClient.post('/generator/generate', {
    post_id: postId,
    template_id: templateId,
    platform,
  });
  return res.data;
};

/** GET /api/generator/outputs/{postId} — list generated images for a post */
export const fetchOutputs = async (postId: string): Promise<OutputImage[]> => {
  const res = await apiClient.get(`/generator/outputs/${postId}`);
  return res.data.data;
};

/**
 * A robust JSON parser that handles both single and double-stringified data.
 * Useful when migrating between frontend-side and backend-side stringification.
 */
export function safeParseJson(data: any): any {
  if (!data) return {};
  if (typeof data === 'object') return data;
  try {
    const first = JSON.parse(data);
    if (typeof first === 'string') return JSON.parse(first);
    return first;
  } catch {
    return {};
  }
}

/** Build the direct URL to serve an image from the backend */
export const getImageUrl = (path: string): string => {
  const base = 'http://localhost:8000/api';
  return `${base}/generator/image/${path}`;
};

/** Build the direct URL to download a PDF carousel from the backend */
export const getPdfUrl = (postId: string): string => {
  const base = 'http://localhost:8000/api';
  return `${base}/generator/pdf/${postId}`;
};

/** Trigger Finder to open the local output folder on Mac */
export const revealInFinder = async (postId: string) => {
  const res = await apiClient.get(`/generator/reveal/${postId}`);
  return res.data;
};

/** POST /api/generator/templates — create or update a template config */
export const saveTemplate = async (data: TemplateDetail) => {
  const res = await apiClient.post('/generator/templates', data);
  return res.data;
};

// ── Local types (generator-specific) ──────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  platforms: string[];
  aspect_ratio: string;
  niche: string[];
  status: string;
}

export interface TemplateDetail extends Template {
  description: string;
  placeholders: string[];
  slides: { index: number; type: string }[];
  colors: Record<string, string>;
}

export interface OutputImage {
  platform: string;
  filename: string;
  path: string;
}
