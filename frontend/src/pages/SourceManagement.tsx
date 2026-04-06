import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, Table, Card, Button, Modal, Form, Input, Select, 
  Space, Tag, Popconfirm, Divider, Badge, Empty, List, message 
} from 'antd';
import { 
  GlobalOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  ThunderboltOutlined,
  HistoryOutlined,
  EditOutlined
} from '@ant-design/icons';
import { 
  fetchFeeds, addFeed, deleteFeed, updateFeed,
  fetchPortals, deletePortal, fetchScheduledJobs, triggerJob
} from '../api/sourceService';
import type { FeedEntry, PortalEntry, ScheduledJob } from '../api/sourceService';

const { Title, Text, Paragraph } = Typography;

const FREQUENCY_LABELS: Record<string, string> = {
  '1h': 'Ultra-Fast (1h)',
  '6h': 'Recommended (6h)',
  '12h': 'Standard (12h)',
  '24h': 'Daily (24h)',
};

const SourceManagement: React.FC = () => {
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [portals, setPortals] = useState<PortalEntry[]>([]);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FeedEntry | null>(null);
  const [form] = Form.useForm();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [f, p, j] = await Promise.all([
        fetchFeeds(),
        fetchPortals(),
        fetchScheduledJobs()
      ]);
      setFeeds(f);
      setPortals(p);
      setJobs(j);
    } catch (err) {
      console.error(err);
      message.error("Failed to load source data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleOpenEdit = (feed: FeedEntry) => {
    setEditingFeed(feed);
    form.setFieldsValue(feed);
    setModalVisible(true);
  };

  const handleOpenAdd = () => {
    setEditingFeed(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSaveFeed = async (values: any) => {
    try {
      if (editingFeed) {
        await updateFeed(values);
        message.success("RSS source updated");
      } else {
        await addFeed(values);
        message.success("RSS source added");
      }
      setModalVisible(false);
      loadAll();
    } catch (err) {
      message.error("Failed to save RSS source");
    }
  };

  const handleDeleteFeed = async (url: string) => {
    try {
      await deleteFeed(url);
      message.success("Source removed");
      loadAll();
    } catch (err) {
      message.error("Failed to remove source");
    }
  };

  const handleTriggerJob = async (jobId: string) => {
    setLoading(true);
    try {
      await triggerJob(jobId);
      message.loading(`Triggering ${jobId}...`, 1.5).then(() => {
        message.success("Task started in background");
        loadAll();
      });
    } catch (err) {
      message.error("Failed to trigger task");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePortal = async (id: string) => {
    try {
      await deletePortal(id);
      message.success("Portal removed");
      loadAll();
    } catch (err) {
      message.error("Failed to remove portal");
    }
  };

  const feedColumns = [
    {
      title: 'Intelligence Source',
      key: 'source',
      render: (_: any, record: FeedEntry) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name || 'Unnamed Source'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.url}</Text>
        </Space>
      )
    },
    {
      title: 'Niche',
      dataIndex: 'niche',
      key: 'niche',
      width: 120,
      render: (n: string) => <Tag color="blue" style={{ borderRadius: 12, padding: '0 10px' }}>{n}</Tag>
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
      width: 140,
      render: (f: string) => (
        <Badge status={f === '1h' ? 'warning' : 'success'} text={f || '6h'} />
      )
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: any, record: FeedEntry) => (
        <Space>
          <Button type="text" shape="circle" icon={<EditOutlined style={{ color: '#1677ff' }} />} onClick={() => handleOpenEdit(record)} />
          <Popconfirm title="Remove this source?" onConfirm={() => handleDeleteFeed(record.url)} okText="Delete" cancelText="Cancel">
            <Button danger type="text" shape="circle" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const portalColumns = [
    {
      title: 'Portal Discovery',
      key: 'portal',
      render: (_: any, record: PortalEntry) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.id}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.url}</Text>
        </Space>
      )
    },
    {
      title: 'Niche',
      dataIndex: 'niche',
      key: 'niche',
      width: 120,
      render: (n: string) => <Tag color="purple" style={{ borderRadius: 12, padding: '0 10px' }}>{n}</Tag>
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: any, record: PortalEntry) => (
        <Popconfirm title="Remove this portal?" onConfirm={() => handleDeletePortal(record.id)}>
          <Button danger type="text" icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space direction="vertical" size={4}>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
            Source & Scheduler Manager
          </Title>
          <Text type="secondary">Control the autonomous ingestion engine and manage feed settings.</Text>
        </Space>
        
        <Card size="small" style={{ borderRadius: 12, background: '#f8fafc' }}>
          <Space>
            <HistoryOutlined style={{ color: '#1677ff' }} />
            <Text type="secondary">Next Global Sweep:</Text>
            <Text strong>~ 2 hours</Text>
          </Space>
        </Card>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* RSS SOURCES */}
          <Card 
            title={
              <Space>
                <ThunderboltOutlined style={{ color: '#52c41a' }} />
                <span>RSS Feeds ({feeds.length})</span>
              </Space>
            }
            extra={
              <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={handleOpenAdd}>
                Add New Source
              </Button>
            }
            bodyStyle={{ padding: 0 }}
            style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          >
            <Table 
              dataSource={feeds} 
              columns={feedColumns} 
              rowKey="url" 
              pagination={false} 
              loading={loading}
              size="large"
            />
          </Card>

          {/* PORTAL SOURCES */}
          <Card 
            title={
              <Space>
                <GlobalOutlined style={{ color: '#722ed1' }} />
                <span>Active Portals ({portals.length})</span>
              </Space>
            }
            className="premium-card"
          >
            <Table 
              dataSource={portals} 
              columns={portalColumns} 
              rowKey="id" 
              pagination={false} 
              loading={loading}
              size="middle"
              locale={{ emptyText: <Empty description="No Portals configured yet." /> }}
            />
          </Card>
        </div>

        {/* SCHEDULER SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card 
            title={
              <Space>
                <ThunderboltOutlined style={{ color: '#faad14' }} />
                <span>Automation Status</span>
              </Space>
            }
            className="premium-card"
            style={{ borderTop: '4px solid #faad14' }}
          >
            <Badge status="processing" text="Scheduler Active" style={{ marginBottom: 16, display: 'block', fontWeight: 600 }} />
            
            <Divider style={{ margin: '8px 0' }}><Text type="secondary" style={{ fontSize: 11 }}>ACTIVE JOBS</Text></Divider>
            
            <List
              loading={loading}
              dataSource={jobs}
              renderItem={(item) => (
                <List.Item 
                  style={{ padding: '12px 0' }}
                  actions={[
                    <Button 
                      key="run" 
                      type="text" 
                      size="small"
                      onClick={() => handleTriggerJob(item.id)}
                      icon={<ThunderboltOutlined style={{ color: '#faad14' }} />}
                    >
                      Run Now
                    </Button>
                  ]}
                >
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Text strong style={{ fontSize: 13 }}>{item.id === 'rss_auto_scrape' ? '🔄 RSS Digester' : '🔭 Portal Discovery'}</Text>
                      <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>ACTIVE</Tag>
                    </div>
                    <Space size={4}>
                      <HistoryOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Next: {item.next_run_time && item.next_run_time !== 'None' ? new Date(item.next_run_time).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Running...'}
                      </Text>
                    </Space>
                  </Space>
                </List.Item>
              )}
            />
            
            <Divider style={{ margin: '16px 0' }} />
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              The scheduler runs in the background even if this page is closed. It ensures your 
              "Raw Content" stays fresh 24/7.
            </Paragraph>
          </Card>

          <Card className="premium-card" style={{ background: '#f0f5ff' }}>
            <Title level={5}>Pro Tip</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              RSS is the most reliable way to get high-quality content. Try to find a /feed/ for all major websites.
            </Text>
          </Card>
        </div>
      </div>

      <Modal
        title={editingFeed ? "Edit RSS Source" : "Add New RSS Source"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        okText={editingFeed ? "Update" : "Add Feed"}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSaveFeed} initialValues={{ niche: 'ai-engineering', frequency: '6h' }}>
          <Form.Item name="name" label="Source Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. AI News Portal" />
          </Form.Item>
          
          <Form.Item name="url" label="Feed URL" rules={[{ required: true, type: 'url' }]}>
            <Input placeholder="https://example.com/feed/" disabled={!!editingFeed} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="niche" label="Niche Tag" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="ai-engineering">AI Engineering</Select.Option>
                <Select.Option value="data-science">Data Science</Select.Option>
                <Select.Option value="productivity">Productivity</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="frequency" label="Fetch Every..." rules={[{ required: true }]}>
              <Select>
                {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                  <Select.Option key={val} value={val}>{label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default SourceManagement;
