import apiClient from './client';

export interface FeedEntry {
  url: string;
  name: string;
  niche: string;
  frequency?: string;
}

// ... existing interfaces ...

export const updateFeed = async (feed: FeedEntry): Promise<void> => {
  await apiClient.put('/sources/feeds', feed);
};

export interface PortalEntry {
  id: string;
  url: string;
  niche: string;
  selectors: any;
}

export interface ScheduledJob {
  id: string;
  next_run_time: string;
  trigger: string;
}

export const fetchFeeds = async (): Promise<FeedEntry[]> => {
  const resp = await apiClient.get('/sources/feeds');
  return resp.data;
};

export const addFeed = async (feed: FeedEntry): Promise<void> => {
  await apiClient.post('/sources/feeds', feed);
};

export const deleteFeed = async (url: string): Promise<void> => {
  await apiClient.delete(`/sources/feeds?url=${encodeURIComponent(url)}`);
};

export const fetchPortals = async (): Promise<PortalEntry[]> => {
  const resp = await apiClient.get('/sources/portals');
  return resp.data;
};

export const deletePortal = async (id: string): Promise<void> => {
  await apiClient.delete(`/sources/portals/${id}`);
};

export const fetchScheduledJobs = async (): Promise<ScheduledJob[]> => {
  const resp = await apiClient.get('/scheduler/jobs');
  return resp.data;
};

export const triggerJob = async (jobId: string): Promise<void> => {
  await apiClient.post(`/scheduler/trigger/${jobId}`);
};
