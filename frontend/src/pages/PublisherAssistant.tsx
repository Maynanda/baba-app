/**
 * pages/PublisherAssistant.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Manual Publishing Hub — Phase 10: Desktop Automation Bridge.
 * 
 * This page lists all posts that have generated visual assets.
 * Users can:
 *  1. View the final Social Media Caption.
 *  2. Review the generated images (Carousel/Story/Feed).
 *  3. Trigger the 'Desktop Assistant' (Playwright) to open a browser and post.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Typography, Card, Row, Col, Button, Tag, Space, 
  Empty, Spin, message, Image, Badge 
} from 'antd';
import { 
  SendOutlined, CopyOutlined, ReloadOutlined, ThunderboltOutlined,
  GlobalOutlined, InstagramOutlined, LinkedinOutlined, SelectOutlined,
  FileTextOutlined, FolderOpenOutlined,
} from '@ant-design/icons';
import { fetchContentData } from '../api/dataService';
import { 
  fetchOutputs, getImageUrl, getPdfUrl, revealInFinder, safeParseJson,
  type OutputImage 
} from '../api/generatorService';
import { pushToAssistant } from '../api/publisherService';
import type { Post } from '../types';

const { Title, Text, Paragraph } = Typography;

const PublisherAssistant: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [images, setImages] = useState<OutputImage[]>([]);
  const [imgsLoading, setImgsLoading] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchContentData();
      // Filter for posts that are likely 'ready' or 'approved'
      setPosts(data.filter(p => ['draft', 'ready', 'approved'].includes(p.status)));
    } catch {
      message.error('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleSelectPost = async (post: Post) => {
    setSelectedPost(post);
    setImgsLoading(true);
    try {
      const imgs = await fetchOutputs(post.id);
      setImages(imgs);
    } catch {
      message.error('Failed to load images.');
    } finally {
      setImgsLoading(false);
    }
  };

  const copyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    message.success('Caption copied to clipboard!');
  };

  const startManualPost = async (platform: string) => {
    if (!selectedPost) return;
    const hide = message.loading(`🚀 Launching Desktop Assistant for ${platform}...`, 0);
    try {
      const res = await pushToAssistant(platform, selectedPost.id);
      message.success(res.message, 6);
    } catch (err: any) {
      message.error(`Failed to launch assistant: ${err.message}`);
    } finally {
      hide();
    }
  };

  // Group images by platform
  const groupedImgs: Record<string, OutputImage[]> = {};
  images.forEach(img => {
    if (!groupedImgs[img.platform]) groupedImgs[img.platform] = [];
    groupedImgs[img.platform].push(img);
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <SendOutlined style={{ marginRight: 12 }} />
          Publisher Assistant
        </Title>
        <Text type="secondary">
          Final bridge: Review assets and trigger desktop posting or download them for manual drag-and-drop.
        </Text>
      </div>

      <Row gutter={24}>
        {/* Left Col: Ready Posts */}
        <Col xs={24} md={8}>
          <Card 
            title="Ready for Publishing" 
            size="small" 
            extra={<Button icon={<ReloadOutlined />} size="small" onClick={loadPosts} loading={loading} />}
          >
            {loading ? <div style={{textAlign: 'center', padding: 20}}><Spin /></div> : (
              posts.length === 0 ? <Empty description="No posts ready" /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {posts.map(p => {
                    const d = safeParseJson(p.data_json);
                    const isActive = selectedPost?.id === p.id;
                    return (
                      <div 
                        key={p.id}
                        onClick={() => handleSelectPost(p)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${isActive ? '#1677ff' : '#e5e7eb'}`,
                          background: isActive ? '#f0f7ff' : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Text strong style={{ fontSize: 13, display: 'block' }}>
                          {d.content_name || p.id}
                        </Text>
                        <Space style={{ marginTop: 4 }}>
                          <Tag style={{ fontSize: 10 }}>{p.niche}</Tag>
                          <Tag color="cyan" style={{ fontSize: 10 }}>{p.template}</Tag>
                        </Space>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </Card>
        </Col>

        {/* Right Col: Review & Publish */}
        <Col xs={24} md={16}>
          {selectedPost ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Caption Section */}
              <Card title="1. Review Caption" size="small">
                {(() => {
                  const d = safeParseJson(selectedPost.data_json);
                  const caption = d.caption || "No caption generated.";
                  return (
                    <>
                      <Paragraph 
                        style={{ 
                          background: '#f8fafc', 
                          padding: 16, 
                          borderRadius: 8, 
                          border: '1px solid #e2e8f0',
                          whiteSpace: 'pre-wrap',
                          fontSize: 13,
                          maxHeight: 200,
                          overflowY: 'auto'
                        }}
                      >
                        {caption}
                      </Paragraph>
                      <Button 
                        icon={<CopyOutlined />} 
                        onClick={() => copyCaption(caption)}
                        block
                        type="dashed"
                      >
                        Copy Caption
                      </Button>
                    </>
                  );
                })()}
              </Card>

              {/* Assets Section */}
              <Card title="2. Visual Assets" size="small" loading={imgsLoading}>
                {images.length === 0 ? <Empty description="No images generated yet" /> : (
                  Object.entries(groupedImgs).map(([platform, imgs]) => (
                    <div key={platform} style={{ marginBottom: 24, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Space>
                          <Badge status="processing" />
                          <Text strong style={{ textTransform: 'capitalize' }}>{platform}</Text>
                          <Tag color="blue">{imgs.length} slides</Tag>
                          <Button 
                            icon={<FileTextOutlined />} 
                            size="small" 
                            href={getPdfUrl(selectedPost.id)} 
                            target="_blank"
                            type="link"
                          >
                            PDF
                          </Button>
                          <Button 
                            icon={<FolderOpenOutlined />} 
                            size="small" 
                            onClick={() => revealInFinder(selectedPost.id)}
                            type="link"
                          >
                            Finder
                          </Button>
                        </Space>
                        <Button 
                          type="primary" 
                          icon={<ThunderboltOutlined />} 
                          size="small"
                          onClick={() => startManualPost(platform)}
                        >
                          Push to Assistant
                        </Button>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                        <Image.PreviewGroup>
                          {imgs.map(img => (
                            <Image 
                              key={img.path}
                              src={getImageUrl(img.path)}
                              width={80}
                              height={80}
                              style={{ objectFit: 'cover', borderRadius: 4 }}
                            />
                          ))}
                        </Image.PreviewGroup>
                      </div>
                    </div>
                  ))
                )}
              </Card>

              {/* Platform Shortcuts */}
              <Card title="3. Manual Posting Links" size="small">
                <Row gutter={[12, 12]}>
                  <Col span={8}>
                    <Button icon={<LinkedinOutlined />} block href="https://www.linkedin.com/feed/" target="_blank">LinkedIn Feed</Button>
                  </Col>
                  <Col span={8}>
                    <Button icon={<InstagramOutlined />} block href="https://www.instagram.com/reels/create/" target="_blank">IG Reel/Feed</Button>
                  </Col>
                  <Col span={8}>
                    <Button icon={<GlobalOutlined />} block href="https://www.tiktok.com/upload" target="_blank">TikTok Upload</Button>
                  </Col>
                </Row>
              </Card>
            </div>
          ) : (
            <Card style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty 
                image={<SelectOutlined style={{ fontSize: 48, color: '#d1d5db' }} />}
                description="Select a post from the left to start publishing" 
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default PublisherAssistant;
