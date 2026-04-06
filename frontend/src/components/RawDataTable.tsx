import React, { useState } from 'react';
import { 
  Table, Tag, Drawer, Typography, Button, Popconfirm, 
  Space, Divider, Image, Tooltip, message, Badge 
} from 'antd';
import { 
  DeleteOutlined, 
  EyeOutlined, 
  CopyOutlined, 
  EditOutlined,
  GlobalOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import type { RawContent } from '../types';

import { getRawImageUrl } from '../api/dataService';
import { safeParseJson } from '../api/generatorService';

const { Title, Paragraph, Text } = Typography;

interface Props {
  data: RawContent[];
  loading: boolean;
  onDelete?: (id: string) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  reddit: 'volcano',
  rss: 'green',
  blog: 'blue',
  google_trends: 'gold',
  portal: 'purple',
  unknown: 'default',
};

const RawDataTable: React.FC<Props> = ({ data, loading, onDelete }) => {
  const [inspectItem, setInspectItem] = useState<RawContent | null>(null);
  const navigate = useNavigate();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard!`);
  };

  const columns: ColumnsType<RawContent> = [
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => (
        <Tag color={SOURCE_COLORS[source] ?? 'default'} style={{ textTransform: 'uppercase', fontSize: 10 }}>{source}</Tag>
      ),
      filters: [...new Set(data.map(d => d.source))].map(s => ({ text: s, value: s })),
      onFilter: (value, record) => record.source === value,
    },
    {
      title: 'Niche',
      dataIndex: 'niche',
      key: 'niche',
      width: 120,
      render: (n: string) => <Tag color="blue">{n}</Tag>,
    },
    {
      title: 'Trending Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string) => <Text strong style={{ color: '#1e293b' }}>{text}</Text>
    },
    {
      title: 'Published',
      key: 'published_at',
      width: 150,
      render: (_, record) => {
        const p = safeParseJson(record.data_json);
        const dateStr = p.published_date || p.date || p.scraped_at;
        return <Text strong style={{ fontSize: 12, color: '#0f172a' }}>{dateStr ? new Date(dateStr).toLocaleDateString() : '—'}</Text>;
      },
      sorter: (a, b) => {
        const d1 = safeParseJson(a.data_json).published_date || a.scraped_at;
        const d2 = safeParseJson(b.data_json).published_date || b.scraped_at;
        return new Date(d1).getTime() - new Date(d2).getTime();
      },
    },
    {
      title: 'Scraped',
      dataIndex: 'scraped_at',
      key: 'scraped_at',
      width: 140,
      render: (val: string) => <Text type="secondary" style={{ fontSize: 11 }}>{val ? new Date(val).toLocaleDateString() : '—'}</Text>,
      sorter: (a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Actions',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="View Research">
            <Button 
              type="text" 
              icon={<EyeOutlined style={{ color: '#1677ff' }} />} 
              onClick={() => setInspectItem(record)} 
            />
          </Tooltip>
          
          <Tooltip title="Start Writing">
            <Button 
              type="text" 
              icon={<EditOutlined style={{ color: '#52c41a' }} />} 
              onClick={() => navigate(`/studio?rawId=${record.id}`)} 
            />
          </Tooltip>

          {onDelete && (
            <Popconfirm title="Delete?" onConfirm={() => onDelete(record.id)}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const parsed = safeParseJson(inspectItem?.data_json);
  const localImages = parsed?.local_images ?? [];
  const remoteImages = parsed?.image_urls ?? [];
  
  const allImages = [
    ...localImages.map((img: string) => ({ type: 'local' as const, url: getRawImageUrl(inspectItem?.id || '', img) })),
    ...remoteImages.map((img: string) => ({ type: 'remote' as const, url: img }))
  ];

  return (
    <>
      <Table<RawContent>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} articles found` }}
        size="middle"
        scroll={{ x: 'max-content' }}
        style={{ width: '100%', background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #f1f5f9' }}
      />

      <Drawer
        title={
          <Space>
            <FileTextOutlined />
            <span>Research: {inspectItem?.title}</span>
          </Space>
        }
        open={!!inspectItem}
        onClose={() => setInspectItem(null)}
        width={800}
        extra={
          <Space>
            <Button 
              icon={<CopyOutlined />} 
              onClick={() => handleCopy(parsed?.body || '', 'Article body')}
            >
              Copy Body
            </Button>
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={() => navigate(`/studio?rawId=${inspectItem?.id}`)}
            >
              Write Post
            </Button>
          </Space>
        }
      >
        {inspectItem && (
          <div style={{ padding: '0 12px' }}>
            <div style={{ marginBottom: 24, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary" style={{ fontSize: 12 }}>FROM SOURCE</Text>
                    <Text strong style={{ fontSize: 16 }}>{parsed?.source_name || inspectItem.source}</Text>
                  </Space>
                  <Space direction="vertical" align="end" size={2}>
                    <Text type="secondary" style={{ fontSize: 12 }}>PUBLISHED</Text>
                    <Text strong>{parsed?.published_date || 'Unknown'}</Text>
                  </Space>
                </div>
                
                <Divider style={{ margin: '8px 0' }} />
                
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>SOURCE URL (CLICK ICON TO COPY)</Text>
                  <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text 
                      copyable={{ tooltips: ['Copy Link', 'Copied!'] }} 
                      ellipsis 
                      style={{ maxWidth: 500, color: '#1677ff', fontSize: 13, background: '#fff', padding: '4px 8px', borderRadius: 4, border: '1px solid #dee2e6' }}
                    >
                      {parsed?.source_url || 'No URL available'}
                    </Text>
                    <Button 
                      type="primary" 
                      ghost
                      size="small"
                      icon={<GlobalOutlined />} 
                      href={parsed?.source_url || '#'} 
                      target="_blank"
                    >
                      Visit Site
                    </Button>
                  </Space>
                </div>
              </Space>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Space wrap>
                {(parsed?.keywords || []).map((kw: string) => (
                  <Tag 
                    key={kw} 
                    color="blue" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCopy(kw, 'Keyword')}
                  >
                    #{kw}
                  </Tag>
                ))}
              </Space>
            </div>

            {allImages.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <Title level={5}>Gallery ({allImages.length})</Title>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
                  <Image.PreviewGroup>
                    {allImages.map((img, idx) => (
                      <div key={idx} style={{ flexShrink: 0, position: 'relative' }}>
                        <Image
                          src={img.url}
                          alt={`Scraped ${idx}`}
                          width={200}
                          height={140}
                          style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #f1f5f9' }}
                          placeholder={<div style={{ width: 200, height: 140, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Badge status="processing" /></div>}
                        />
                        <Tag 
                          style={{ position: 'absolute', top: 4, left: 4, opacity: 0.8, fontSize: 8 }}
                          color={img.type === 'local' ? 'green' : 'blue'}
                        >
                          {img.type === 'local' ? 'DOWNLOADED' : 'REMOTE'}
                        </Tag>
                      </div>
                    ))}
                  </Image.PreviewGroup>
                </div>
              </div>
            )}

            <div style={{ marginTop: 32, marginBottom: 8 }}>
              <Text strong style={{ fontSize: 16, color: '#1e293b' }}>Article Summary / Body</Text>
            </div>
            <Divider style={{ margin: '8px 0 24px 0' }} />
            
            <Paragraph style={{ 
              background: '#f8fafc', 
              padding: 24, 
              borderRadius: 12, 
              border: '1px solid #e2e8f0',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.8,
              fontSize: 14,
              color: '#334155'
            }}>
              {parsed?.body || "No body content extracted for this item."}
            </Paragraph>

            <Divider />
            
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Article ID: {inspectItem.id} • Scraped via {inspectItem.source} Agent
              </Text>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default RawDataTable;
