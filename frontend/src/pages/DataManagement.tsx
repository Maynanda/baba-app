/**
 * pages/DataManagement.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Page for viewing all data in the SQLite database.
 * This file owns state + data loading. UI rendering is delegated to components.
 *
 * Tabs:
 *  1. Raw Scraped Content  → RawDataTable
 *  2. Content Pipeline     → Posts table (inline, simple)
 *  3. Discovered Links     → DiscoveredTable (inline)
 *
 * Rule for agents: Keep this file focused on state management.
 * Complex table UIs should be split into their own component in src/components/.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Tabs, Typography, message, Table, Tag, Button,
} from 'antd';
import { DatabaseOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';

import {
  fetchRawData,
  fetchContentData,
  fetchDiscoveredLinks,
  deleteRawItem,
} from '../api/dataService';
import type { RawContent, Post, DiscoveredLink } from '../types';
import RawDataTable from '../components/RawDataTable';

const { Title, Text } = Typography;

// ── Status badge colors ───────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  raw: 'default',
  draft: 'processing',
  approved: 'green',
  scheduled: 'blue',
  published: 'purple',
  archived: 'volcano',
  discovered: 'cyan',
  scraped: 'green',
};

// ── DataManagement page ───────────────────────────────────────────────────────
const DataManagement: React.FC = () => {
  const [rawData, setRawData]           = useState<RawContent[]>([]);
  const [postsData, setPostsData]       = useState<Post[]>([]);
  const [discovered, setDiscovered]     = useState<DiscoveredLink[]>([]);
  const [rawLoading, setRawLoading]     = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [discLoading, setDiscLoading]   = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadRaw = useCallback(async () => {
    setRawLoading(true);
    try {
      setRawData(await fetchRawData());
    } catch {
      message.error('Failed to load raw data. Is the API running?');
    } finally {
      setRawLoading(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      setPostsData(await fetchContentData());
    } catch {
      message.error('Failed to load content posts.');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadDiscovered = useCallback(async () => {
    setDiscLoading(true);
    try {
      setDiscovered(await fetchDiscoveredLinks());
    } catch {
      message.error('Failed to load discovered links.');
    } finally {
      setDiscLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadRaw();
    loadPosts();
    loadDiscovered();
  }, [loadRaw, loadPosts, loadDiscovered]);

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDeleteRaw = async (id: string) => {
    try {
      await deleteRawItem(id);
      setRawData(prev => prev.filter(item => item.id !== id));
      message.success('Item deleted.');
    } catch {
      message.error('Failed to delete item.');
    }
  };

  // ── Posts table columns ────────────────────────────────────────────────────
  const postColumns: ColumnsType<Post> = [
    { title: 'ID', dataIndex: 'id', key: 'id', ellipsis: true, width: 200 },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
    },
    { title: 'Niche', dataIndex: 'niche', key: 'niche', width: 130 },
    { title: 'Template', dataIndex: 'template', key: 'template', width: 160 },
    {
      title: 'Updated', dataIndex: 'updated_at', key: 'updated_at', width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString() : '—',
      sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      defaultSortOrder: 'descend',
    },
  ];

  // ── Discovered links table columns ─────────────────────────────────────────
  const discColumns: ColumnsType<DiscoveredLink> = [
    { title: 'Portal', dataIndex: 'portal_id', key: 'portal_id', width: 140 },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
    },
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true, width: 260,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      ),
    },
    {
      title: 'Discovered', dataIndex: 'discovered_at', key: 'discovered_at', width: 165,
      render: (v: string) => v ? new Date(v).toLocaleString() : '—',
      defaultSortOrder: 'descend',
      sorter: (a, b) => new Date(a.discovered_at).getTime() - new Date(b.discovered_at).getTime(),
    },
  ];

  // ── Tabs definition ────────────────────────────────────────────────────────
  const tabs = [
    {
      key: 'raw',
      label: `🗃️ Raw Content (${rawData.length})`,
      children: (
        <>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadRaw}
            loading={rawLoading}
            style={{ marginBottom: 12 }}
          >
            Refresh
          </Button>
          <RawDataTable data={rawData} loading={rawLoading} onDelete={handleDeleteRaw} />
        </>
      ),
    },
    {
      key: 'content',
      label: `📝 Content Pipeline (${postsData.length})`,
      children: (
        <>
          <Button icon={<ReloadOutlined />} onClick={loadPosts} loading={postsLoading} style={{ marginBottom: 12 }}>
            Refresh
          </Button>
          <Table<Post>
            dataSource={postsData}
            columns={postColumns}
            rowKey="id"
            loading={postsLoading}
            size="small"
            pagination={{ pageSize: 15, showTotal: (t) => `${t} posts` }}
            scroll={{ x: 'max-content' }}
            style={{ width: '100%' }}
          />
        </>
      ),
    },
    {
      key: 'discovered',
      label: `🔗 Discovered Links (${discovered.length})`,
      children: (
        <>
          <Button icon={<ReloadOutlined />} onClick={loadDiscovered} loading={discLoading} style={{ marginBottom: 12 }}>
            Refresh
          </Button>
          <Table<DiscoveredLink>
            dataSource={discovered}
            columns={discColumns}
            rowKey="id"
            loading={discLoading}
            size="small"
            pagination={{ pageSize: 15, showTotal: (t) => `${t} links` }}
            scroll={{ x: 'max-content' }}
            style={{ width: '100%' }}
            locale={{
              emptyText: (
                <div style={{ padding: '32px 0' }}>
                  <Text type="secondary">No discovered links found.</Text>
                  <br />
                  <Link to="/scraper" style={{ fontSize: 12 }}>Go to Scraper Console to add a Portal</Link>
                </div>
              )
            }}
          />
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: '0', maxWidth: '100%', margin: '0' }}>
      <div style={{ padding: '24px 32px 0 32px', marginBottom: 32 }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 800, letterSpacing: '-0.02em' }}>
          <DatabaseOutlined style={{ marginRight: 12, color: '#38bdf8' }} />
          Data Intelligence
        </Title>
        <Text style={{ color: '#64748b', fontSize: 14 }}>
          Manage your research, pipeline, and discovered opportunities from a single command center.
        </Text>
      </div>
      
      <div style={{ padding: '0 32px 32px 32px' }}>
        <Tabs
          defaultActiveKey="raw"
          items={tabs}
          className="premium-tabs"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
};

export default DataManagement;
