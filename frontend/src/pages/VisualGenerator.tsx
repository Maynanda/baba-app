/**
 * pages/VisualGenerator.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual asset generator: PPTX → PDF → PNG pipeline per content post.
 *
 * Features:
 *  - Browse all saved content posts (from Content Studio pipeline)
 *  - Click a post to see its details (name, niche, template, slides)
 *  - Re-generate the same post with any template + any platform (mix freely)
 *  - Auto-polls for new images 5 seconds after generation starts
 *  - Images grouped by platform, shown in a masonry-style grid
 *  - Manual Refresh button always available
 *
 * Rule for agents:
 *  - Posts come from dataService.fetchContentData()
 *  - Templates from generatorService.fetchTemplates()
 *  - Generate via generatorService.triggerGenerate(postId, templateId, platform)
 *  - Images loaded via generatorService.fetchOutputs(postId)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Row, Col, Card, Select, Button, Typography, Space, Divider,
  message, Image, Tag, Empty, Spin, Tooltip, Alert,
} from 'antd';
import {
  FormatPainterOutlined, ThunderboltOutlined, ReloadOutlined,
  FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined,
  PictureOutlined, InfoCircleOutlined, FolderOpenOutlined,
} from '@ant-design/icons';
import { fetchContentData } from '../api/dataService';
import {
  fetchTemplates, triggerGenerate, fetchOutputs, getImageUrl,
  getPdfUrl, revealInFinder, safeParseJson,
  type Template, type OutputImage,
} from '../api/generatorService';
import type { Post } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = [
  { label: '💼 LinkedIn Carousel (PDF)', value: 'linkedin' },
  { label: '📸 Instagram Feed (1:1 PNG)', value: 'instagram_feed' },
  { label: '📱 Instagram Story (9:16 PNG)', value: 'instagram_story' },
  { label: '🎵 TikTok Slideshow (9:16 PNG)', value: 'tiktok' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: '#faad14', ready: '#1677ff', published: '#52c41a', error: '#ff4d4f',
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Post detail card shown after selecting a post */
const PostDetailCard: React.FC<{ post: Post }> = ({ post }) => {
  const dataJson = safeParseJson(post.data_json);
  const slides = dataJson.slides ?? (Array.isArray(dataJson.slides_data) ? dataJson.slides_data : []);
  const name = dataJson.content_name || post.id;
  const platforms: string[] = dataJson.platform ?? (dataJson.platforms ? [dataJson.platforms] : []);

  return (
    <div style={{
      padding: '10px 12px', background: '#f8fafc',
      borderRadius: 6, border: '1px solid #e2e8f0', marginTop: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text strong style={{ fontSize: 13, display: 'block' }}>{name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{post.id}</Text>
        </div>
        <Tag color={STATUS_COLORS[post.status] ? undefined : 'default'}
          style={{ background: STATUS_COLORS[post.status], color: '#fff', border: 'none', fontSize: 10 }}>
          {post.status}
        </Tag>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <Space wrap size={4}>
        {post.niche && <Tag style={{ fontSize: 10 }}>{post.niche}</Tag>}
        {post.template && <Tag color="blue" style={{ fontSize: 10 }}>Template: {post.template}</Tag>}
        {platforms.map(p => <Tag key={p} color="purple" style={{ fontSize: 10 }}>{p}</Tag>)}
      </Space>

      {slides.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>
            {slides.length} slide{slides.length !== 1 ? 's' : ''} in this post
          </Text>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {slides.map((s: any, i: number) => (
              <span key={i} style={{
                fontSize: 10, padding: '2px 6px',
                background: '#e0e7ff', borderRadius: 10, color: '#4338ca',
              }}>
                {s.type || `slide ${i + 1}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** Images grouped by platform */
const ImageGrid: React.FC<{
  images: OutputImage[];
  loading: boolean;
}> = ({ images, loading }) => {
  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <Spin />
      <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>Loading images…</div>
    </div>
  );

  if (images.length === 0) return (
    <Empty
      image={<PictureOutlined style={{ fontSize: 48, color: '#cbd5e1' }} />}
      imageStyle={{ height: 60 }}
      description={
        <Space direction="vertical" size={4} style={{ textAlign: 'center' }}>
          <Text type="secondary">No images yet for this post.</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Choose a template + platform above, then click Generate.
          </Text>
        </Space>
      }
      style={{ padding: '40px 0' }}
    />
  );

  // Group images by platform
  const grouped: Record<string, OutputImage[]> = {};
  images.forEach(img => {
    if (!grouped[img.platform]) grouped[img.platform] = [];
    grouped[img.platform].push(img);
  });

  return (
    <Image.PreviewGroup>
      {Object.entries(grouped).map(([platform, imgs]) => (
        <div key={platform} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Text strong style={{ fontSize: 13 }}>{platform}</Text>
            <Tag color="blue" style={{ fontSize: 10 }}>{imgs.length} image{imgs.length !== 1 ? 's' : ''}</Tag>
          </div>
          <Row gutter={[10, 10]}>
            {imgs.map(img => (
              <Col key={img.path} xs={12} sm={8} md={6} lg={4}>
                <Card
                  hoverable
                  size="small"
                  bodyStyle={{ padding: '4px 6px' }}
                  cover={
                    <Image
                      src={getImageUrl(img.path)}
                      alt={img.filename}
                      style={{ objectFit: 'cover', borderRadius: '4px 4px 0 0' }}
                      placeholder={
                        <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Spin size="small" />
                        </div>
                      }
                    />
                  }
                >
                  <Text style={{ fontSize: 9 }} type="secondary" ellipsis>{img.filename}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </Image.PreviewGroup>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const VisualGenerator: React.FC = () => {
  const [posts, setPosts]         = useState<Post[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [images, setImages]       = useState<OutputImage[]>([]);

  const [selectedPost, setSelectedPost]         = useState<string | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('linkedin');

  const [postsLoading, setPostsLoading]   = useState(false);
  const [generating, setGenerating]       = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadInitialData = useCallback(async () => {
    setPostsLoading(true);
    try {
      const [p, t] = await Promise.all([fetchContentData(), fetchTemplates()]);
      setPosts(p);
      setTemplates(t);
      if (t.length > 0) setSelectedTemplate(t[0].id);
    } catch {
      message.error('Failed to load. Is the API running?');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const doRefreshImages = useCallback(async (postId: string, silent = false) => {
    if (!postId) return;
    setImagesLoading(true);
    try {
      const imgs = await fetchOutputs(postId);
      setImages(imgs);
      if (!silent && imgs.length === 0) {
        message.info('No images yet for this post.');
      }
    } catch {
      if (!silent) message.error('Failed to load images.');
    } finally {
      setImagesLoading(false);
    }
  }, []);

  // When post changes → load its existing images
  useEffect(() => {
    if (selectedPost) {
      setImages([]);
      setGenerationStatus(null);
      doRefreshImages(selectedPost, true);
    }
  }, [selectedPost]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup poll timer on unmount
  useEffect(() => () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); }, []);

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!selectedPost || !selectedTemplate) {
      message.warning('Select a post and template first.');
      return;
    }
    setGenerating(true);
    setGenerationStatus('running');
    try {
      await triggerGenerate(selectedPost, selectedTemplate, selectedPlatform);

      const platformLabel = PLATFORM_OPTIONS.find(p => p.value === selectedPlatform)?.label ?? selectedPlatform;
      message.success(`🚀 Generating for ${platformLabel}…`);

      // Auto-poll after 8 seconds, then again at 20s
      const doAutoRefresh = (delayMs: number) => {
        pollTimerRef.current = setTimeout(async () => {
          const imgs = await fetchOutputs(selectedPost).catch(() => []);
          if (imgs.length > 0) {
            setImages(imgs);
            setGenerationStatus('done');
          } else {
            // Second attempt at 20s
            if (delayMs < 15000) doAutoRefresh(15000);
          }
        }, delayMs);
      };
      doAutoRefresh(8000);

    } catch (err: any) {
      message.error(`Generation failed: ${err?.response?.data?.detail ?? err?.message}`);
      setGenerationStatus(null);
    } finally {
      setGenerating(false);
    }
  };

  const handleManualRefresh = () => {
    if (!selectedPost) { message.warning('Select a post first.'); return; }
    doRefreshImages(selectedPost, false);
  };

  const [nicheFilter, setNicheFilter] = useState<string | undefined>();
  
  const selectedPostData = posts.find(p => p.id === selectedPost);

  // Filter posts by niche
  const filteredPosts = posts.filter(p => !nicheFilter || p.niche === nicheFilter);

  const postOptions = filteredPosts.map(p => {
    let name = p.id;
    try {
      const d = JSON.parse(p.data_json ?? '{}');
      if (d.content_name) name = `${d.content_name}`;
    } catch { /* keep id */ }
    return { value: p.id, label: name, status: p.status, niche: p.niche };
  });

  const NICHE_LIST = Array.from(new Set(posts.map(p => p.niche).filter(Boolean)));

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 2 }}>
          <FormatPainterOutlined style={{ marginRight: 8 }} />
          Visual Generator
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Turn content pipeline posts into platform-ready images. You can re-generate
          the same post with different templates or platforms any time.
        </Text>
      </div>

      <Row gutter={[16, 16]}>

        {/* ── Left col: Controls + Post detail ────────────────────────────── */}
        <Col xs={24} lg={8}>
          <Card
            size="small"
            title={
              <Space>
                <FileTextOutlined />
                <Text strong>Select Content Post</Text>
              </Space>
            }
          >
            {posts.length === 0 && !postsLoading && (
              <Alert
                type="info"
                icon={<InfoCircleOutlined />}
                showIcon
                message="No saved posts yet"
                description="Go to Content Studio, write your slides, and save to the pipeline first."
                style={{ marginBottom: 10 }}
              />
            )}

            <div style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, display: 'block', marginBottom: 4 }} type="secondary">Filter by Niche</Text>
              <Select
                placeholder="All Niches"
                style={{ width: '100%' }}
                allowClear
                value={nicheFilter}
                onChange={v => { setNicheFilter(v); setSelectedPost(undefined); }}
                options={NICHE_LIST.map(n => ({ label: n, value: n }))}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }} strong>Post</Text>
              <Select
                placeholder="Select a saved post…"
                style={{ width: '100%' }}
                loading={postsLoading}
                value={selectedPost}
                onChange={v => setSelectedPost(v)}
                showSearch
                filterOption={(input, opt) =>
                  (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                optionRender={opt => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Space>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: STATUS_COLORS[(opt.data as any)?.status] ?? '#999',
                      }} />
                      <span style={{ fontSize: 12 }}>{opt.label}</span>
                    </Space>
                    <Tag style={{ fontSize: 9, margin: 0 }}>{(opt.data as any)?.niche}</Tag>
                  </div>
                )}
                options={postOptions}
              />
            </div>

            {/* Post detail preview */}
            {selectedPostData && <PostDetailCard post={selectedPostData} />}
          </Card>

          {/* Generation controls */}
          <Card
            size="small"
            title={
              <Space>
                <ThunderboltOutlined />
                <Text strong>Generate</Text>
                <Tooltip title="You can run the same post with different templates or platforms — each run adds to the output gallery below.">
                  <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                </Tooltip>
              </Space>
            }
            style={{ marginTop: 12 }}
          >
            <div style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }} strong>Template</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedTemplate}
                onChange={setSelectedTemplate}
                placeholder="Select template…"
              >
                {templates.map(t => (
                  <Option key={t.id} value={t.id}>
                    <Space size={4}>
                      {t.name}
                      <Tag style={{ fontSize: 10 }}>{t.aspect_ratio}</Tag>
                    </Space>
                  </Option>
                ))}
              </Select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }} strong>Platform</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedPlatform}
                onChange={setSelectedPlatform}
                options={PLATFORM_OPTIONS}
              />
            </div>

            {/* Status indicator */}
            {generationStatus === 'running' && (
              <Alert
                type="info"
                icon={<ClockCircleOutlined />}
                showIcon
                message="Generating… auto-refreshing in ~8s"
                style={{ marginBottom: 10, fontSize: 11 }}
              />
            )}
            {generationStatus === 'done' && (
              <Alert
                type="success"
                icon={<CheckCircleOutlined />}
                showIcon
                message="Done! Images loaded below."
                style={{ marginBottom: 10, fontSize: 11 }}
              />
            )}

            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleGenerate}
              loading={generating}
              disabled={!selectedPost || !selectedTemplate}
              block
              size="middle"
            >
              {generating ? 'Starting…' : 'Generate Visuals'}
            </Button>

            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 6, textAlign: 'center' }}>
              Each run is independent — different template or platform = new images added
            </Text>
          </Card>
        </Col>

        {/* ── Right col: Image gallery ─────────────────────────────────────── */}
        <Col xs={24} lg={16}>
          <Card
            size="small"
            title={
              <Space>
                <PictureOutlined />
                <Text strong>
                  Generated Images
                  {images.length > 0 && (
                    <Tag style={{ marginLeft: 8 }} color="blue">{images.length} total</Tag>
                  )}
                </Text>
              </Space>
            }
            extra={
              <Space>
                {selectedPost && (
                  <>
                    <Button 
                      icon={<FileTextOutlined />} 
                      size="small"
                      href={getPdfUrl(selectedPost)}
                      target="_blank"
                      disabled={images.length === 0}
                    >
                      Download PDF
                    </Button>
                    <Button 
                      icon={<FolderOpenOutlined />} 
                      size="small"
                      onClick={() => revealInFinder(selectedPost)}
                      disabled={images.length === 0}
                    >
                      Open in Finder
                    </Button>
                  </>
                )}
                <Button
                  icon={<ReloadOutlined />}
                  size="small"
                  onClick={handleManualRefresh}
                  loading={imagesLoading}
                >
                  Refresh
                </Button>
              </Space>
            }
            bodyStyle={{ minHeight: 300 }}
          >
            <ImageGrid images={images} loading={imagesLoading} />
          </Card>
        </Col>

      </Row>
    </div>
  );
};

export default VisualGenerator;
