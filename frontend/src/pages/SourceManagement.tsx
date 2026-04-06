import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, Table, Card, Button, Modal, Form, Input, Select, 
  Space, Tag, Popconfirm, Divider, Badge, Empty, List, message, Switch
} from 'antd';
import { 
  GlobalOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  ThunderboltOutlined,
  HistoryOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { 
  fetchFeeds, addFeed, deleteFeed, updateFeed,
  fetchPortals, deletePortal, fetchScheduledJobs, triggerJob,
  fetchSchedulerSettings, updateSchedulerSettings,
  type FeedEntry, type PortalEntry, type ScheduledJob, type SchedulerConfig 
} from '../api/sourceService';

const { Title, Text, Paragraph } = Typography;

const FREQUENCY_OPTIONS = [1, 2, 6, 12, 24];

const SourceManagement: React.FC = () => {
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [portals, setPortals] = useState<PortalEntry[]>([]);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [schedulerConfigs, setSchedulerConfigs] = useState<Record<string, SchedulerConfig>>({});
  
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FeedEntry | null>(null);
  const [form] = Form.useForm();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [f, p, j, configs] = await Promise.all([
        fetchFeeds(),
        fetchPortals(),
        fetchScheduledJobs(),
        fetchSchedulerSettings()
      ]);
      setFeeds(f);
      setPortals(p);
      setJobs(j);
      setSchedulerConfigs(configs);
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

  const handleUpdateJob = async (jobId: string, enabled: boolean, freq: number) => {
    try {
      await updateSchedulerSettings(jobId, enabled, freq);
      message.success(`Automation settings updated`);
      loadAll();
    } catch (err) {
      message.error("Failed to update scheduler");
    }
  };

  const handleTriggerJob = async (jobId: string) => {
    try {
      await triggerJob(jobId);
      message.success("Manual task triggered");
      loadAll();
    } catch (err) {
      message.error("Failed to trigger task");
    }
  };

  const handleOpenEdit = (feed: FeedEntry) => {
    setEditingFeed(feed);
    form.setFieldsValue(feed);
    setModalVisible(true);
  };

  const handleSaveFeed = async (values: any) => {
    try {
      if (editingFeed) {
        await updateFeed(values);
        message.success("Source updated");
      } else {
        await addFeed(values);
        message.success("Source added");
      }
      setModalVisible(false);
      loadAll();
    } catch (err) {
      message.error("Failed to save source");
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
      width: 140,
      render: (n: string) => <Tag color="blue">{n}</Tag>
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: any, record: FeedEntry) => (
        <Space>
          <Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          <Popconfirm title="Remove source?" onConfirm={() => handleDeleteFeed(record.url)}>
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
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, record: PortalEntry) => (
        <Popconfirm title="Remove portal?" onConfirm={() => handleDeletePortal(record.id)}>
          <Button danger type="text" icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <Title level={2}>Source & Scheduler Manager</Title>
        <Text type="secondary">Manage autonomous intelligence gathering and automation intervals.</Text>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* RSS Feed Card */}
          <Card 
            title={<Space><ThunderboltOutlined style={{ color: '#52c41a' }} /><span>RSS Intelligence Feeds</span></Space>}
            extra={<Button type="primary" shape="round" icon={<PlusOutlined />} onClick={() => { setEditingFeed(null); form.resetFields(); setModalVisible(true); }}>Add Source</Button>}
            bodyStyle={{ padding: 0 }}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <Table dataSource={feeds} columns={feedColumns} rowKey="url" pagination={false} loading={loading} />
          </Card>

          {/* Portal Discovery Card */}
          <Card 
            title={<Space><GlobalOutlined style={{ color: '#722ed1' }} /><span>Discovery Portals</span></Space>}
            style={{ borderRadius: 16 }}
          >
            <Table dataSource={portals} columns={portalColumns} rowKey="id" pagination={false} loading={loading} />
          </Card>
        </div>

        {/* Scheduler Status Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card 
            title={<Space><ClockCircleOutlined style={{ color: '#faad14' }} /><span>Automation Status</span></Space>}
            style={{ borderRadius: 16 }}
          >
            <List
              loading={loading}
              dataSource={Object.entries(schedulerConfigs)}
              renderItem={([id, config]) => {
                const job = jobs.find(j => j.id === id);
                return (
                  <Card size="small" style={{ marginBottom: 12, background: config.enabled ? '#fff' : '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                       <Space direction="vertical" size={0}>
                          <Text strong>{config.name}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{id}</Text>
                       </Space>
                       <Switch 
                         checked={config.enabled} 
                         onChange={(checked) => handleUpdateJob(id, checked, config.frequency_hours)} 
                         size="small"
                       />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <Space direction="vertical" size={2}>
                          <Space size={4}>
                             <ClockCircleOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                             <Text type="secondary" style={{ fontSize: 11 }}>Every {config.frequency_hours}h</Text>
                          </Space>
                          <Space size={4}>
                             <HistoryOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                             <Text type="secondary" style={{ fontSize: 11 }}>
                               Next: {job?.next_run_time && job.next_run_time !== 'None' ? new Date(job.next_run_time).toLocaleTimeString() : 'Paused'}
                             </Text>
                          </Space>
                       </Space>
                       
                       <Space>
                          <Select 
                            size="small" 
                            style={{ width: 70 }} 
                            value={config.frequency_hours}
                            onChange={(v) => handleUpdateJob(id, config.enabled, v)}
                          >
                             {FREQUENCY_OPTIONS.map(f => <Select.Option key={f} value={f}>{f}h</Select.Option>)}
                          </Select>
                          <Button 
                            shape="circle" 
                            size="small" 
                            icon={<ThunderboltOutlined />} 
                            onClick={() => handleTriggerJob(id)}
                            title="Run Now"
                          />
                       </Space>
                    </div>
                  </Card>
                );
              }}
            />
          </Card>
          
          <Card style={{ background: '#f0f5ff', borderRadius: 16 }}>
             <Title level={5}>Pro Automation</Title>
             <Text type="secondary" style={{ fontSize: 13 }}>
                Increase frequency (1h-2h) for breaking news sources, and decrease it (24h) for slower portals to save resources.
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
        <Form form={form} layout="vertical" onFinish={handleSaveFeed} initialValues={{ niche: 'ai-engineering' }}>
          <Form.Item name="name" label="Source Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. AI News Portal" />
          </Form.Item>
          
          <Form.Item name="url" label="Feed URL" rules={[{ required: true, type: 'url' }]}>
            <Input placeholder="https://example.com/feed/" disabled={!!editingFeed} />
          </Form.Item>

          <Form.Item name="niche" label="Niche Tag" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="ai-engineering">AI Engineering</Select.Option>
              <Select.Option value="data-science">Data Science</Select.Option>
              <Select.Option value="productivity">Productivity</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SourceManagement;
