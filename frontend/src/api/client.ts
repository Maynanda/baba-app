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

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // Synthesis can take time (e.g. Pro Mode or complex search)
});

export default apiClient;
