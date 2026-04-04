/**
 * api/scraperService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All Scraper-related API calls in one place.
 * Each function maps 1:1 to a FastAPI endpoint in api/routers/scraper.py.
 *
 * Rule for agents: Add a new function here for every new scraper endpoint.
 * Keep all functions pure (no state, no UI side-effects).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import apiClient from './client';

/** POST /api/scrape/rss */
export const triggerRssScrape = async (niche?: string) => {
  const response = await apiClient.post('/scrape/rss', { niche: niche ?? null });
  return response.data;
};

/** POST /api/scrape/url */
export const triggerUrlScrape = async (
  url: string,
  niche: string = 'ai-engineering',
  useStealth: boolean = false,
) => {
  const response = await apiClient.post('/scrape/url', {
    url,
    niche,
    use_stealth: useStealth,
  });
  return response.data;
};

/** POST /api/scrape/trends */
export const triggerTrendsScrape = async (
  source: 'google' | 'reddit' | 'all' = 'all',
  niche: string = 'ai-engineering',
) => {
  const response = await apiClient.post('/scrape/trends', { source, niche });
  return response.data;
};

/** POST /api/scrape/discovery */
export const triggerPortalDiscovery = async (useStealth: boolean = false) => {
  const response = await apiClient.post('/scrape/discovery', {
    use_stealth: useStealth,
  });
  return response.data;
};

/** POST /api/scrape/portal — synchronous, returns parsed config + preview */
export const addPortal = async (
  url: string,
  niche: string = 'ai-engineering',
  useStealth: boolean = false,
) => {
  const response = await apiClient.post('/scrape/portal', {
    url,
    niche,
    use_stealth: useStealth,
  });
  return response.data;
};
