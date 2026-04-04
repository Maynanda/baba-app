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
  Typography, Space, message, Divider,
} from 'antd';
import {
  CloudSyncOutlined, LinkOutlined, FireOutlined,
  GlobalOutlined, SearchOutlined,
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

// ── Sub-components (one per scraper card) ─────────────────────────────────────

const RssCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState<string | undefined>(undefined);

  const run = async () => {
    setLoading(true);
    try {
      await triggerRssScrape(niche);
      message.success('RSS scrape started in background. Check Data → Raw tab in a few seconds.');
    } catch {
      message.error('Failed to start RSS scrape. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><CloudSyncOutlined /> RSS Feed Scraper</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        Reads all feeds from <code>config/feeds.yaml</code> and saves new articles
        to the raw database. Skips duplicates automatically.
      </Paragraph>
      <Space>
        <Select
          placeholder="Filter by niche (optional)"
          allowClear
          style={{ width: 220 }}
          onChange={setNiche}
        >
          <Option value="ai-engineering">AI Engineering</Option>
          <Option value="data-science">Data Science</Option>
        </Select>
        <Button type="primary" onClick={run} loading={loading}>
          Run RSS Scrape
        </Button>
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
    } catch (err: any) {
      if (err?.errorFields) return; // Ant Design validation error — already shown
      message.error('Failed to start URL scrape. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><LinkOutlined /> Single URL Deep Scrape</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        Deep-scrapes a single article URL using Scrapling. Enable Stealth Mode
        to bypass anti-bot protections with patchright.
      </Paragraph>
      <Form form={form} layout="vertical" initialValues={{ niche: 'ai-engineering', use_stealth: false }}>
        <Form.Item name="url" label="Article URL" rules={[{ required: true, type: 'url', message: 'Enter a valid URL' }]}>
          <Input placeholder="https://example.com/some-article" />
        </Form.Item>
        <Space wrap>
          <Form.Item name="niche" label="Niche" style={{ marginBottom: 0 }}>
            <Select style={{ width: 180 }}>
              <Option value="ai-engineering">AI Engineering</Option>
              <Option value="data-science">Data Science</Option>
            </Select>
          </Form.Item>
          <Form.Item name="use_stealth" label="Stealth Mode" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Space>
        <Divider style={{ margin: '12px 0' }} />
        <Button type="primary" onClick={run} loading={loading}>
          Run URL Scrape
        </Button>
      </Form>
    </Card>
  );
};


const TrendsCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'google' | 'reddit' | 'all'>('all');

  const run = async () => {
    setLoading(true);
    try {
      await triggerTrendsScrape(source);
      message.success(`Trends scrape (${source}) started in background.`);
    } catch {
      message.error('Failed to start trends scrape. Reddit credentials may be missing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><FireOutlined /> Trends Scraper (Google + Reddit)</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        Fetches rising Google Trends and top Reddit posts from AI/DS subreddits.
        Reddit requires credentials in <code>config/.env</code>.
      </Paragraph>
      <Space>
        <Select value={source} onChange={setSource} style={{ width: 150 }}>
          <Option value="all">All Sources</Option>
          <Option value="google">Google Only</Option>
          <Option value="reddit">Reddit Only</Option>
        </Select>
        <Button type="primary" onClick={run} loading={loading}>
          Run Trends Scrape
        </Button>
      </Space>
    </Card>
  );
};


const PortalDiscoveryCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stealth, setStealth] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      await triggerPortalDiscovery(stealth);
      message.success('Portal discovery started. Check Data → Discovered tab.');
    } catch {
      message.error('Failed to start portal discovery. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><GlobalOutlined /> Portal Discovery</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        Crawls all configured portals in <code>config/portals.yaml</code> and
        discovers new article links, saving them to the discovered_links table.
      </Paragraph>
      <Space>
        <Switch
          checked={stealth}
          onChange={setStealth}
          checkedChildren="Stealth ON"
          unCheckedChildren="Stealth OFF"
        />
        <Button type="primary" onClick={run} loading={loading}>
          Run Discovery
        </Button>
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
        message.success(`Portal added! Found ${result.preview_links?.length ?? 0} article links.`);
        form.resetFields(['url']);
      } else {
        message.warning(`Parser generated but no links found: ${result.error ?? 'unknown'}`);
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Failed to parse portal. Try enabling Stealth Mode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><SearchOutlined /> Add New Portal</>} size="small">
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        Provide a portal/blog homepage URL. The auto-parser will detect article
        link patterns and save the config to <code>config/portals.yaml</code>.
      </Paragraph>
      <Form form={form} layout="vertical" initialValues={{ niche: 'ai-engineering', use_stealth: false }}>
        <Form.Item name="url" label="Portal URL" rules={[{ required: true, type: 'url', message: 'Enter a valid URL' }]}>
          <Input placeholder="https://towardsdatascience.com" />
        </Form.Item>
        <Space wrap>
          <Form.Item name="niche" label="Niche" style={{ marginBottom: 0 }}>
            <Select style={{ width: 180 }}>
              <Option value="ai-engineering">AI Engineering</Option>
              <Option value="data-science">Data Science</Option>
            </Select>
          </Form.Item>
          <Form.Item name="use_stealth" label="Stealth Mode" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Space>
        <Divider style={{ margin: '12px 0' }} />
        <Button type="primary" onClick={run} loading={loading}>
          Auto-Parse & Add Portal
        </Button>
      </Form>
    </Card>
  );
};


// ── Page root ─────────────────────────────────────────────────────────────────

const ScraperConsole: React.FC = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <div>
      <Title level={2}><CloudSyncOutlined style={{ marginRight: 8 }} />Scraper Console</Title>
      <Text type="secondary">
        Each card triggers an independent background job on the Python backend.
        Jobs run asynchronously — refresh the Data Management tab to see results.
      </Text>
    </div>
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}><RssCard /></Col>
      <Col xs={24} lg={12}><UrlCard /></Col>
      <Col xs={24} lg={12}><TrendsCard /></Col>
      <Col xs={24} lg={12}><PortalDiscoveryCard /></Col>
      <Col xs={24}><AddPortalCard /></Col>
    </Row>
  </Space>
);

export default ScraperConsole;
