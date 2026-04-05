/**
 * pages/Walkthrough.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User Guide & Tutorial page — explains the 4-step content lifecycle.
 * Uses Ant Design Cards and Typhography to create a premium reading experience.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Typography, Card, Steps, Row, Col, Space, Badge, Divider } from 'antd';
import {
  RocketOutlined, 
  SearchOutlined, 
  EditOutlined, 
  PictureOutlined, 
  SendOutlined,
  BulbOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const Walkthrough: React.FC = () => {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 0' }}>
      {/* Header section */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Badge count="New v2.2" offset={[10, 0]} color="#1677ff">
          <Title level={1} style={{ marginBottom: 8 }}>
            <RocketOutlined style={{ marginRight: 12, color: '#1677ff' }} />
            Baba-App Guide
          </Title>
        </Badge>
        <Paragraph type="secondary" style={{ fontSize: 16 }}>
          Your end-to-end automated pipeline for AI Engineering & Data Science content.
        </Paragraph>
      </div>

      <Steps
        direction="vertical"
        current={-1}
        style={{ marginBottom: 40 }}
        items={[
          {
            title: <Title level={4}>Step 1: Intelligence Gathering</Title>,
            description: "Start by scraping high-value articles, Reddit trends, or RSS feeds in the Scraper Console.",
            icon: <SearchOutlined />,
          },
          {
            title: <Title level={4}>Step 2: Content Engineering</Title>,
            description: "Review raw articles in the Content Studio. Use 'AI Magic Draft' to auto-generate slides and captions.",
            icon: <EditOutlined />,
          },
          {
            title: <Title level={4}>Step 3: Visual Generation</Title>,
            description: "Pick your draft and a PPTX template. Render high-res PNGs for Instagram/TikTok or PDFs for LinkedIn.",
            icon: <PictureOutlined />,
          },
          {
            title: <Title level={4}>Step 4: Platform Publishing</Title>,
            description: "Review your gallery and use the Desktop Assistant to post to social media.",
            icon: <SendOutlined />,
          },
        ]}
      />

      <Divider />

      <Title level={3} style={{ marginBottom: 24 }}>Core Modules Deep-Dive</Title>

      <Row gutter={[24, 24]}>
        {/* Scraper Card */}
        <Col xs={24} md={12}>
          <Card 
            hoverable 
            title={<><SearchOutlined /> Scraper Console</>} 
            style={{ height: '100%' }}
          >
            <Paragraph>
              Use **Stealth Mode** to bypass bot protections. 
            </Paragraph>
            <Space direction="vertical" size={2}>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> RSS Feeds from tech blogs</Text>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> Reddit & Google Trends</Text>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> Deep URL scraping via Scrapling</Text>
            </Space>
          </Card>
        </Col>

        {/* Studio Card */}
        <Col xs={24} md={12}>
          <Card 
            hoverable 
            title={<><EditOutlined /> Content Studio</>} 
            style={{ height: '100%', borderColor: '#6366f1' }}
          >
            <Badge.Ribbon text="AI Ready" color="purple">
              <Paragraph>
                The **AI Magic Draft** uses Gemini to turn complex research into simple slides.
              </Paragraph>
            </Badge.Ribbon>
            <Space direction="vertical" size={2}>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> 5-Slide Carousel Drafting</Text>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> Social Media Caption Engine</Text>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> Live Studio Preview</Text>
            </Space>
          </Card>
        </Col>

        {/* Generator Card */}
        <Col xs={24} md={12}>
          <Card 
            hoverable 
            title={<><PictureOutlined /> Visual Generator</>} 
            style={{ height: '100%' }}
          >
            <Paragraph>
              Your content is rendered using professional **PowerPoint Templates**.
            </Paragraph>
            <Space direction="vertical" size={2}>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> 1:1 Square & 9:16 Vertical</Text>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> Automated PPTX → PDF → PNG</Text>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> Multi-platform gallery view</Text>
            </Space>
          </Card>
        </Col>

        {/* Publisher Card */}
        <Col xs={24} md={12}>
          <Card 
            hoverable 
            title={<><SendOutlined /> Publisher Assistant</>} 
            style={{ height: '100%' }}
          >
            <Paragraph>
              The bridge between generation and posting.
            </Paragraph>
            <Space direction="vertical" size={2}>
              <Text><BulbOutlined style={{color: '#faad14'}} /> Desktop login & Posting automation</Text>
              <Text><BulbOutlined style={{color: '#faad14'}} /> Direct API integration (In Development)</Text>
              <Text><CheckCircleOutlined style={{color: '#52c41a'}} /> One-click copy-paste captions</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 60, textAlign: 'center', padding: '40px 0', background: '#f8fafc', borderRadius: 12 }}>
        <Title level={4}>Happy Creating!</Title>
        <Text type="secondary">Baba-App v2.2 by Antigravity AI</Text>
      </div>
    </div>
  );
};

export default Walkthrough;
