/**
 * pages/VisualGenerator.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Page for generating visual assets (PPTX → PDF → PNG) from content posts.
 *
 * Flow:
 *  1. User picks a content post from the DB
 *  2. User picks a template and platform
 *  3. User clicks Generate → triggers background job on backend
 *  4. User clicks "Refresh Images" to see generated PNGs displayed as a grid
 *
 * Rule for agents: This page manages state only. Image display is handled
 * by the ImageGrid sub-component defined below. Service calls via generatorService.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Row, Col, Card, Select, Button, Typography, Space,
  message, Image, Tag, Empty, Spin, Divider, Badge,
} from 'antd';
import { FormatPainterOutlined, ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchContentData } from '../api/dataService';
import {
  fetchTemplates, triggerGenerate, fetchOutputs, getImageUrl,
  type Template, type OutputImage,
} from '../api/generatorService';
import type { Post } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const PLATFORM_OPTIONS = [
  { label: '💼 LinkedIn (PDF Carousel)', value: 'linkedin' },
  { label: '📸 Instagram Feed (1:1 PNG)', value: 'instagram_feed' },
  { label: '📱 Instagram Story (9:16 PNG)', value: 'instagram_story' },
  { label: '🎵 TikTok Slideshow (9:16 PNG)', value: 'tiktok' },
];

// ── Image grid sub-component ──────────────────────────────────────────────────

interface ImageGridProps {
  images: OutputImage[];
  loading: boolean;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, loading }) => {
  if (loading) return <Spin tip="Loading images..." style={{ display: 'block', marginTop: 32 }} />;
  if (images.length === 0) return (
    <Empty
      description="No images generated yet. Select a post and click Generate."
      style={{ marginTop: 32 }}
    />
  );

  return (
    <Image.PreviewGroup>
      <Row gutter={[12, 12]}>
        {images.map((img) => (
          <Col key={img.path} xs={12} sm={8} md={6} lg={4}>
            <Card
              size="small"
              bodyStyle={{ padding: 4 }}
              cover={
                <Image
                  src={getImageUrl(img.path)}
                  alt={img.filename}
                  style={{ objectFit: 'cover' }}
                  placeholder={<Spin />}
                />
              }
            >
              <Text style={{ fontSize: 10 }} type="secondary">{img.filename}</Text>
              <br />
              <Tag color="blue" style={{ fontSize: 10 }}>{img.platform}</Tag>
            </Card>
          </Col>
        ))}
      </Row>
    </Image.PreviewGroup>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const VisualGenerator: React.FC = () => {
  const [posts, setPosts]             = useState<Post[]>([]);
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [images, setImages]           = useState<OutputImage[]>([]);

  const [selectedPost, setSelectedPost]         = useState<string | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('linkedin');

  const [postsLoading, setPostsLoading]     = useState(false);
  const [generating, setGenerating]         = useState(false);
  const [imagesLoading, setImagesLoading]   = useState(false);

  // Load posts and templates on mount
  const loadInitialData = useCallback(async () => {
    setPostsLoading(true);
    try {
      const [p, t] = await Promise.all([fetchContentData(), fetchTemplates()]);
      setPosts(p);
      setTemplates(t);
      if (t.length > 0) setSelectedTemplate(t[0].id);
    } catch {
      message.error('Failed to load posts or templates. Is the API running?');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const handleGenerate = async () => {
    if (!selectedPost || !selectedTemplate) {
      message.warning('Please select a post and a template first.');
      return;
    }
    setGenerating(true);
    try {
      await triggerGenerate(selectedPost, selectedTemplate, selectedPlatform);
      message.success(
        'Generation started! Click "Refresh Images" in ~10–30 seconds to see results.',
        5,
      );
    } catch {
      message.error('Generation failed. Is LibreOffice installed?');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefreshImages = useCallback(async () => {
    if (!selectedPost) {
      message.warning('Select a post first to load its images.');
      return;
    }
    setImagesLoading(true);
    try {
      const imgs = await fetchOutputs(selectedPost);
      setImages(imgs);
      if (imgs.length === 0) message.info('No images found yet. Try generating first.');
    } catch {
      message.error('Failed to load images.');
    } finally {
      setImagesLoading(false);
    }
  }, [selectedPost]);

  // Auto-refresh images when post selection changes (if already has outputs)
  useEffect(() => {
    if (selectedPost) {
      setImages([]);
      handleRefreshImages();
    }
  }, [selectedPost]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPostData = posts.find(p => p.id === selectedPost);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={2}>
          <FormatPainterOutlined style={{ marginRight: 8 }} />
          Visual Generator
        </Title>
        <Text type="secondary">
          Select a content post, choose a template and platform, then generate PNG slides.
        </Text>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <Card title="Generation Controls" size="small">
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Content Post</Text>
            <Select
              placeholder="Select a post..."
              style={{ width: '100%' }}
              loading={postsLoading}
              value={selectedPost}
              onChange={setSelectedPost}
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={posts.map(p => ({
                value: p.id,
                label: `${p.id} — ${p.status}`,
              }))}
            />
          </Col>

          <Col xs={24} md={7}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Template</Text>
            <Select
              style={{ width: '100%' }}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
            >
              {templates.map(t => (
                <Option key={t.id} value={t.id}>
                  {t.name}
                  <Tag style={{ marginLeft: 8 }} color="default">{t.aspect_ratio}</Tag>
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Platform</Text>
            <Select
              style={{ width: '100%' }}
              value={selectedPlatform}
              onChange={setSelectedPlatform}
              options={PLATFORM_OPTIONS}
            />
          </Col>

          <Col xs={24} md={3}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleGenerate}
              loading={generating}
              style={{ width: '100%' }}
            >
              Generate
            </Button>
          </Col>
        </Row>

        {/* Post metadata preview */}
        {selectedPostData && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Space wrap>
              <Badge status="processing" text={`Status: ${selectedPostData.status}`} />
              <Text type="secondary">Niche: {selectedPostData.niche}</Text>
              <Text type="secondary">Template: {selectedPostData.template || '—'}</Text>
            </Space>
          </>
        )}
      </Card>

      {/* ── Image output grid ─────────────────────────────────────────────── */}
      <Card
        title={`Generated Images (${images.length})`}
        size="small"
        extra={
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={handleRefreshImages}
            loading={imagesLoading}
          >
            Refresh Images
          </Button>
        }
      >
        <ImageGrid images={images} loading={imagesLoading} />
      </Card>
    </Space>
  );
};

export default VisualGenerator;
