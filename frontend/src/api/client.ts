/**
 * api/client.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Axios HTTP client for all requests to the FastAPI backend.
 *
 * Rule for agents: Import THIS client in every service file.
 * Never create a raw `axios.get/post` inline in a component or page.
 * Change baseURL here to point to a different environment (e.g. staging).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds — scraping tasks can take a while
});

export default apiClient;
