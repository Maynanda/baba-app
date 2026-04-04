/**
 * types/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central TypeScript interfaces mirroring the SQLite schemas and FastAPI
 * response shapes in main_api.py.
 *
 * Rule for agents: When you add a new API endpoint, add a matching interface
 * here FIRST, then use it in the service and component.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Database records ──────────────────────────────────────────────────────────

/** Raw scraped item — maps to `raw_content` table */
export interface RawContent {
  id: string;
  niche: string;
  source: string;
  title: string;
  data_json: string;   // JSON string — parse when inspecting full detail
  scraped_at: string;  // ISO 8601 timestamp
}

/** Content post — maps to `posts` table */
export interface Post {
  id: string;
  status: 'raw' | 'draft' | 'approved' | 'scheduled' | 'published' | 'archived';
  niche: string;
  template: string;
  platforms: string;  // JSON string array e.g. '["linkedin","instagram_feed"]'
  data_json: string;  // JSON string — parse for slide content
  created_at: string;
  updated_at: string;
}

/** Portal-discovered link — maps to `discovered_links` table */
export interface DiscoveredLink {
  id: string;
  portal_id: string;
  url: string;
  title: string;
  status: 'discovered' | 'scraped';
  discovered_at: string;
}

// ── API responses ─────────────────────────────────────────────────────────────

/** Standard list response from FastAPI */
export interface ListResponse<T> {
  data: T[];
}

/** Background job response — scraper endpoints return this */
export interface JobResponse {
  status: 'started' | 'ok';
  job?: string;
  [key: string]: unknown;
}
