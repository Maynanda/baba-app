/**
 * pages/ContentStudio.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 3-panel FULL-SCREEN content authoring studio.
 *
 * Dynamic Template Support:
 * - Fetches full template schema on selection.
 * - Auto-generates editor fields for ANY placeholder in the template.
 * - Groups fields logically (e.g., HOOK_*, BODY_1_*) for UI clarity.
 * - Live Preview adapts to the selected template's color palette and field set.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Select, Button, Form, Input, Typography,
  Space, message, Tag, Divider, Spin, Empty, Row, Col,
} from 'antd';
import {
  EditOutlined, SaveOutlined, EyeOutlined,
} from '@ant-design/icons';
import apiClient from '../api/client';
import {
  fetchRawData, getRawImageUrl,
} from '../api/dataService';
import {
  fetchTemplates, fetchTemplate,
  type Template, type TemplateDetail,
} from '../api/generatorService';
import { createAiDraft } from '../api/agentService';
import type { RawContent } from '../types';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const NICHE_OPTIONS = [
  { label: 'AI Engineering', value: 'ai-engineering' },
  { label: 'Data Science', value: 'data-science' },
  { label: 'Personal Brand', value: 'personal-brand' },
  { label: 'Digital Marketing', value: 'digital-marketing' },
  { label: 'Business AI', value: 'business-ai' },
];

const NicheSelect: React.FC<{ value?: string; onChange: (v: string) => void; style?: React.CSSProperties }> = ({ value, onChange, style }) => (
  <Select
    mode="tags"
    placeholder="Select or type niche"
    value={value ? [value] : []}
    onChange={(vals) => onChange(vals[vals.length - 1])}
    style={{ width: '100%', ...style }}
    maxCount={1}
    options={NICHE_OPTIONS}
  />
);

const SOURCE_COLORS: Record<string, string> = {
  rss: '#22c55e', blog: '#3b82f6', reddit: '#f97316',
  google_trends: '#eab308', portal: '#a855f7',
};

function parseJson(s: string): Record<string, any> {
  try { return JSON.parse(s); } catch { return {}; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel 1 — Source Browser
// ─────────────────────────────────────────────────────────────────────────────

const SourceBrowser: React.FC<{
  items: RawContent[];
  loading: boolean;
  selected: RawContent | null;
  onSelect: (item: RawContent) => void;
  onAiDraft: (id: string) => void;
  isDrafting: boolean;
}> = ({ items, loading, selected, onSelect, onAiDraft, isDrafting }) => {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.source.toLowerCase().includes(search.toLowerCase()),
  );
  
  const parsed = selected ? parseJson(selected.data_json) : null;
  const localImages = parsed?.local_images ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <Input.Search
        placeholder="Search articles…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        size="small"
        allowClear
      />

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 6 }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center' }}><Spin size="small" /></div>
        ) : filtered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No articles" />
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                borderLeft: `3px solid ${selected?.id === item.id ? (SOURCE_COLORS[item.source] ?? '#1677ff') : 'transparent'}`,
                background: selected?.id === item.id ? '#eff6ff' : '#fff',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.35 }}>{item.title}</div>
              <Tag color={SOURCE_COLORS[item.source]} style={{ fontSize: 9, marginTop: 4 }}>{item.source}</Tag>
            </div>
          ))
        )}
      </div>

      {selected && parsed && (
        <div style={{ height: '50%', overflowY: 'auto', borderTop: '2px solid #f3f4f6', paddingTop: 12 }}>
          <Text strong style={{ fontSize: 12 }}>{selected.title}</Text>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, marginBottom: 8 }}>
            {parsed.body?.slice(0, 500)}...
          </div>
          
          {localImages.length > 0 && (
             <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 16 }}>
               {localImages.map((img: string, i: number) => (
                 <img key={i} src={getRawImageUrl(selected.id, img)} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
               ))}
             </div>
          )}

          <Button 
            type="primary" 
            block 
            icon={<EditOutlined />} 
            onClick={() => onAiDraft(selected.id)}
            loading={isDrafting}
            style={{ borderRadius: 6, background: '#6366f1' }}
          >
            ✨ AI Magic Draft
          </Button>
        </div>
      )}
    </div>
  );
};

const ContentStudio: React.FC = () => {
  const [form] = Form.useForm();
  
  // Data State
  const [rawItems, setRawItems] = useState<RawContent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedRaw, setSelectedRaw] = useState<RawContent | null>(null);
  const [fullTemplate, setFullTemplate] = useState<TemplateDetail | null>(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [liveValues, setLiveValues] = useState<any>({});

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([fetchRawData(), fetchTemplates()]);
      setRawItems(r);
      setTemplates(t);
      if (t.length > 0) handleTemplateSelection(t[0].id);
    } catch {
      message.error('Failed to load studio data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTemplateSelection = async (tplId: string) => {
    try {
      const detail = await fetchTemplate(tplId);
      setFullTemplate(detail);
      form.setFieldValue('template', tplId);
    } catch {
      message.error('Error fetching template details');
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onAiDraft = async (rawId: string) => {
    const tplId = form.getFieldValue('template');
    if (!tplId) return message.warning('Select a template first.');
    
    setIsDrafting(true);
    try {
      const res = await createAiDraft(rawId, tplId);
      form.setFieldsValue({
        content_name: res.content_name || 'New Post',
        niche: res.niche,
        platform: res.platforms,
        caption: res.caption,
        ...res.slides_data,
      });
      setLiveValues(form.getFieldsValue());
      message.success('Magic Draft complete!');
    } catch (err) {
      message.error('AI Drafting failed.');
    } finally {
      setIsDrafting(false);
    }
  };

  const onSave = async () => {
    try {
      const vals = await form.validateFields();
      const slidesData = (fullTemplate?.placeholders ?? []).reduce((acc: any, p: string) => {
        acc[p] = vals[p];
        return acc;
      }, {});

      const payload = {
        id: `post_${Date.now()}`,
        status: 'ready',
        niche: vals.niche,
        template: vals.template,
        data_json: JSON.stringify({
          content_name: vals.content_name,
          platform: vals.platform,
          caption: vals.caption,
          slides: slidesData
        }),
        raw_ref_id: selectedRaw?.id,
      };
      await apiClient.post('/data/content', payload);
      message.success('Content saved to pipeline!');
    } catch {
      message.error('Please fill required fields.');
    }
  };

  // ── Dynamic Field Grouping ────────────────────────────────────────────────

  const placeholders = fullTemplate?.placeholders ?? [];
  const groups: Record<string, string[]> = {};
  
  placeholders.forEach(p => {
    const parts = p.split('_');
    const groupKey = parts.length > 1 ? parts[0] : 'MAIN';
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(p);
  });

  return (
    <div style={{
      height: 'calc(100vh - 56px)',
      display: 'grid',
      gridTemplateColumns: '320px 1fr 360px',
      background: '#f1f5f9',
      overflow: 'hidden'
    }}>
      {/* ── Panel 1: Sources (Full Height Scroll) ── */}
      <div style={{ borderRight: '1px solid #e2e8f0', background: '#fff', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px', borderBottom: '1px solid #f1f5f9' }}>
           <Title level={5} style={{ margin: 0, fontSize: 13 }}>Research Sources</Title>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          <SourceBrowser
            items={rawItems}
            loading={loading}
            selected={selectedRaw}
            onSelect={setSelectedRaw}
            onAiDraft={onAiDraft}
            isDrafting={isDrafting}
          />
        </div>
      </div>

      {/* ── Panel 2: Editor (Center Stage) ── */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
        <div style={{ 
          padding: '12px 24px', 
          background: '#fff',
          borderBottom: '1px solid #f1f5f9', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          zIndex: 10
        }}>
          <Space><EditOutlined style={{ color: '#6366f1' }} /> <Text strong style={{ fontSize: 14 }}>Authoring Studio</Text></Space>
          <Space>
            <Button size="small" icon={<SaveOutlined />} onClick={onSave} type="primary" style={{ borderRadius: 6 }}>Save to Pipeline</Button>
          </Space>
        </div>

        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          <Form form={form} layout="vertical" onValuesChange={(_, all) => setLiveValues(all)}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="content_name" label="Post Title" required><Input placeholder="Internal label" style={{ borderRadius: 6 }} /></Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="niche" label="Niche" required>
                    <NicheSelect value={form.getFieldValue('niche')} onChange={v => form.setFieldValue('niche', v)} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="template" label="Design Style" required>
                    <Select onChange={handleTemplateSelection} style={{ borderRadius: 6 }}>
                      {templates.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="platform" label="Target Platforms" initialValue={['linkedin']}>
                <Select mode="multiple" style={{ borderRadius: 6 }}>
                  <Option value="linkedin">LinkedIn PDF</Option>
                  <Option value="instagram_feed">Instagram Feed</Option>
                  <Option value="instagram_story">Story</Option>
                  <Option value="tiktok">TikTok Slideshow</Option>
                </Select>
              </Form.Item>

              <Divider />

              {/* Render Placeholder Sections */}
              {Object.entries(groups).map(([group, fields]) => (
                <div key={group} style={{ marginBottom: 32 }}>
                  <div style={{ borderLeft: '4px solid #6366f1', paddingLeft: 12, marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {group.replace('_', ' ')}
                    </Text>
                  </div>
                  {fields.map(field => (
                     <Form.Item key={field} name={field} label={field.replace(group + '_', '').replace('_', ' ')} style={{ marginBottom: 16 }}>
                        {field.includes('TEXT') || field.includes('BODY') || field.includes('DESC') ? (
                          <TextArea rows={2} autoSize={{ minRows: 2, maxRows: 8 }} style={{ borderRadius: 6, fontSize: 13, lineHeight: 1.6 }} />
                        ) : <Input style={{ borderRadius: 6 }} />}
                     </Form.Item>
                  ))}
                </div>
              ))}

              <Divider />
              <Form.Item name="caption" label="Social Companion Post"><TextArea rows={6} style={{ borderRadius: 6 }} /></Form.Item>
            </div>
          </Form>
        </div>
      </div>

      {/* ── Panel 3: Live Preview (Right Sidebar) ── */}
      <div style={{ borderLeft: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
          <Space><EyeOutlined style={{ color: '#10b981' }} /> <Text strong style={{ fontSize: 13 }}>Live Deck Preview</Text></Space>
        </div>
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
           {Object.keys(groups).map((group, idx) => (
             <div 
              key={group} 
              style={{
                background: fullTemplate?.colors?.primary || '#1e293b',
                color: fullTemplate?.colors?.text || '#fff',
                padding: 24, borderRadius: 16, marginBottom: 20, minHeight: 240,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'transform 0.2s'
              }}
             >
               <div style={{ fontSize: 9, opacity: 0.5, marginBottom: 12 }}>SLIDE {idx + 1}</div>
               {groups[group].map(f => (
                 <div key={f} style={{ marginBottom: 8 }}>
                    {f.includes('TITLE') || f.includes('HOOK') ? 
                      <div style={{ fontSize: 16, fontWeight: 'bold', lineHeight: 1.2 }}>{liveValues[f] || f}</div> :
                      <div style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.4 }}>{liveValues[f] || '...'}</div>
                    }
                 </div>
               ))}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default ContentStudio;
