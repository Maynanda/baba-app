/**
 * pages/ScraperConsole.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * UI page for triggering all scraping jobs.
 * Each Card maps to one backend endpoint in api/routers/scraper.py.
 *
 * Rule for agents: Add a new Card per new scraper type.
 * Wire its "Run" button to the matching scraperService function.
 * Pages own state and call services — they never call apiClient directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  Card, Col, Row, Button, Form, Input, Select, Switch,
  Typography, Space, message, Tag,
} from 'antd';
import {
  CloudSyncOutlined, LinkOutlined, FireOutlined,
  GlobalOutlined, SearchOutlined, PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  triggerRssScrape,
  triggerUrlScrape,
  triggerTrendsScrape,
  triggerPortalDiscovery,
  addPortal,
} from '../api/scraperService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const NICHE_OPTIONS = [
  { label: 'AI Engineering', value: 'ai-engineering' },
  { label: 'Data Science', value: 'data-science' },
  { label: 'Personal Brand', value: 'personal-brand' },
  { label: 'Digital Marketing', value: 'digital-marketing' },
  { label: 'Business AI', value: 'business-ai' },
];

const NicheSelect: React.FC<{ value?: string; onChange: (v: string) => void; style?: React.CSSProperties }> = ({ value, onChange, style }) => {
  return (
    <Select
      mode="tags"
      placeholder="Select or type niche"
      value={value ? [value] : []}
      onChange={(vals) => {
        const val = vals[vals.length - 1]; // Get last entered
        onChange(val);
      }}
      style={{ width: 220, ...style }}
      maxCount={1}
      options={NICHE_OPTIONS}
    />
  );
};

// ── Sub-components (one per scraper card) ─────────────────────────────────────

const RssCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState<string | undefined>(undefined);

  const run = async () => {
    setLoading(true);
    try {
      await triggerRssScrape(niche);
      message.success('RSS scrape started in background. Check Data → Raw tab soon.');
    } catch {
      message.error('Failed to start RSS scrape.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><CloudSyncOutlined /> RSS Feed Scraper</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        Reads all feeds from <code>config/feeds.yaml</code> and saves new articles.
      </Paragraph>
      <Space>
        <NicheSelect value={niche} onChange={setNiche} />
        <Button type="primary" onClick={run} loading={loading}>Run RSS Scrape</Button>
      </Space>
    </Card>
  );
};

const UrlCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const run = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await triggerUrlScrape(values.url, values.niche, values.use_stealth);
      message.success('URL scrape started in background.');
      form.resetFields(['url']);
    } catch {
      message.error('Failed to start URL scrape.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><LinkOutlined /> Single URL Deep Scrape</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        Deep-scrapes a single article URL. Enable Stealth Mode for anti-bot.
      </Paragraph>
      <Form form={form} layout="vertical" initialValues={{ niche: 'ai-engineering', use_stealth: false }}>
        <Form.Item name="url" label="Article URL" rules={[{ required: true, type: 'url' }]}>
          <Input placeholder="https://example.com/some-article" />
        </Form.Item>
        <Space wrap align="end">
          <Form.Item name="niche" label="Niche" style={{ marginBottom: 0 }}>
             <Select showSearch allowClear style={{ width: 180 }} options={NICHE_OPTIONS} />
          </Form.Item>
          <Form.Item name="use_stealth" label="Stealth Mode" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
          <Button type="primary" onClick={run} loading={loading}>Run URL Scrape</Button>
        </Space>
      </Form>
    </Card>
  );
};

const TrendsCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'google' | 'reddit' | 'all'>('all');
  const [niche, setNiche] = useState<string>('ai-engineering');

  const run = async () => {
    setLoading(true);
    try {
      await triggerTrendsScrape(source, niche);
      message.success(`Trends scrape (${source}) started with niche: ${niche}`);
    } catch {
      message.error('Failed to start trends scrape.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><FireOutlined /> Trends Scraper (Google + Reddit)</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        Fetches rising Google Trends and top Reddit posts from subreddits.
      </Paragraph>
      <Space wrap>
        <Select value={source} onChange={setSource} style={{ width: 120 }}>
          <Option value="all">All Sources</Option>
          <Option value="google">Google Only</Option>
          <Option value="reddit">Reddit Only</Option>
        </Select>
        <NicheSelect value={niche} onChange={setNiche} style={{ width: 150 }} />
        <Button type="primary" onClick={run} loading={loading}>Run Trends Scrape</Button>
      </Space>
    </Card>
  );
};

const PortalDiscoveryCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stealth, setStealth] = useState(false);
  const [niche, setNiche] = useState<string | undefined>(undefined);

  const run = async () => {
    setLoading(true);
    try {
      await triggerPortalDiscovery(stealth, niche);
      message.success('Portal discovery started.');
    } catch {
      message.error('Failed to start portal discovery.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><GlobalOutlined /> Portal Discovery</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        Crawls all configured portals and discovers new article links.
      </Paragraph>
      <Space wrap>
        <Switch
          checked={stealth}
          onChange={setStealth}
          checkedChildren="Stealth ON"
          unCheckedChildren="Stealth OFF"
        />
        <NicheSelect value={niche} onChange={v => setNiche(v)} style={{ width: 180 }} />
        <Button type="primary" onClick={run} loading={loading}>Run Discovery</Button>
      </Space>
    </Card>
  );
};

const AddPortalCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const run = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const result = await addPortal(values.url, values.niche, values.use_stealth);
      if (result.success) {
        message.success(`Portal added with niche: ${values.niche}`);
        form.resetFields(['url']);
      } else {
        message.warning(`Parser generated but no links found.`);
      }
    } catch {
      message.error('Failed to parse portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><SearchOutlined /> Add New Portal</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        The auto-parser will detect article link patterns and save the config.
      </Paragraph>
      <Form form={form} layout="vertical" initialValues={{ niche: 'ai-engineering', use_stealth: false }}>
        <Form.Item name="url" label="Portal URL" rules={[{ required: true, type: 'url' }]}>
          <Input placeholder="https://towardsdatascience.com" />
        </Form.Item>
        <Space wrap align="end">
          <Form.Item name="niche" label="Niche" style={{ marginBottom: 0 }}>
             <Select showSearch allowClear style={{ width: 180 }} options={NICHE_OPTIONS} />
          </Form.Item>
          <Form.Item name="use_stealth" label="Stealth Mode" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
          <Button type="primary" onClick={run} loading={loading}>Auto-Parse & Add Portal</Button>
        </Space>
      </Form>
    </Card>
  );
};

// ── Page root ─────────────────────────────────────────────────────────────────

const ScraperConsole: React.FC = () => (
  <div style={{ padding: '24px 32px' }}>
    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div>
        <Title level={3} style={{ margin: 0, letterSpacing: '-0.02em' }}>
          <CloudSyncOutlined style={{ marginRight: 12, color: '#3b82f6' }} />
          Scraper Command Center
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Manage your automated data ingestion pipeline.
        </Text>
      </div>
      <Tag color="processing" icon={<ReloadOutlined spin />}>Status: Live</Tag>
    </div>

    <Row gutter={[20, 20]}>
      <Col xs={24} md={12} lg={8}><RssCard /></Col>
      <Col xs={24} md={12} lg={8}><UrlCard /></Col>
      <Col xs={24} md={12} lg={8}><TrendsCard /></Col>
      <Col xs={24} md={12} lg={8}><PortalDiscoveryCard /></Col>
      <Col xs={24} lg={16}><AddPortalCard /></Col>
    </Row>
  </div>
);

export default ScraperConsole;

