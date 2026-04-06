/**
 * pages/ContentStudio.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ULTIMATE WORKSPACE (Refined & Rock Solid Resizing)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Select, Button, Form, Input, Typography,
  Space, message, Tag, Divider, Spin, Empty, Row, Col,
} from 'antd';
import {
  EditOutlined, SaveOutlined, EyeOutlined, RobotOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, RightOutlined, LeftOutlined,
  PictureOutlined, CopyOutlined,
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

const SOURCE_COLORS: Record<string, string> = {
  rss: '#22c55e', blog: '#3b82f6', reddit: '#f97316',
  google_trends: '#eab308', portal: '#a855f7',
};

function parseJson(s: string): Record<string, any> {
  try { return JSON.parse(s); } catch { return {}; }
}

const NicheSelect: React.FC<{ value?: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <Select
    mode="tags"
    placeholder="Niche"
    value={value ? [value] : []}
    onChange={(vals) => onChange(vals[vals.length - 1])}
    style={{ width: '100%' }}
    maxCount={1}
    options={[
      { label: 'AI Engineering', value: 'ai-engineering' },
      { label: 'Data Science', value: 'data-science' },
      { label: 'Digital Marketing', value: 'digital-marketing' },
    ]}
  />
);

const SourceBrowser: React.FC<{
  items: RawContent[];
  loading: boolean;
  selected: RawContent | null;
  onSelect: (item: RawContent) => void;
}> = ({ items, loading, selected, onSelect }) => {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.source.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 12 }}>
        <Input.Search placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} size="small" allowClear />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
        {loading ? <div style={{ padding: 20, textAlign: 'center' }}><Spin size="small" /></div> : 
         filtered.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> :
         filtered.map(item => (
           <div key={item.id} onClick={() => onSelect(item)} style={{
             padding: '10px 14px', cursor: 'pointer',
             borderLeft: `4px solid ${selected?.id === item.id ? (SOURCE_COLORS[item.source] ?? '#6366f1') : 'transparent'}`,
             background: selected?.id === item.id ? '#eff6ff' : '#fff',
             borderBottom: '1px solid #f8fafc',
           }}>
             <div style={{ fontSize: 11, fontWeight: 500, color: selected?.id === item.id ? '#1e40af' : '#334155' }}>
               {item.title}
             </div>
             <Tag color={SOURCE_COLORS[item.source]} style={{ fontSize: 8, marginTop: 4 }}>{item.source}</Tag>
           </div>
         ))}
      </div>
    </div>
  );
};

const ContentStudio: React.FC = () => {
  const [form] = Form.useForm();
  const [rawItems, setRawItems] = useState<RawContent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedRaw, setSelectedRaw] = useState<RawContent | null>(null);
  const [fullTemplate, setFullTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [liveValues, setLiveValues] = useState<any>({});
  
  // Robust Panel State
  const [listWidth, setListWidth] = useState(250);
  const [inspectorWidth, setInspectorWidth] = useState(400);
  const [previewWidth, setPreviewWidth] = useState(320);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  const draggingRef = useRef<string | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      if (draggingRef.current === 'list') setListWidth(Math.max(100, Math.min(400, e.clientX)));
      if (draggingRef.current === 'inspector') setInspectorWidth(Math.max(200, Math.min(600, e.clientX - (listCollapsed?0:listWidth))));
      if (draggingRef.current === 'preview') setPreviewWidth(Math.max(150, Math.min(500, window.innerWidth - e.clientX)));
    };
    const onUp = () => { draggingRef.current = null; document.body.style.cursor = 'default'; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [listWidth, inspectorWidth, listCollapsed]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([fetchRawData(), fetchTemplates()]);
      setRawItems(r);
      setTemplates(t);
      if (t.length > 0) handleTemplateSelection(t[0].id);
    } catch { message.error('Data loading error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTemplateSelection = async (tplId: string) => {
    try {
      const detail = await fetchTemplate(tplId);
      setFullTemplate(detail);
      form.setFieldValue('template', tplId);
    } catch { message.error('Template detail error'); }
  };

  const onAiDraft = async (rawId: string) => {
    const tplId = form.getFieldValue('template');
    if (!tplId) return message.warning('Pick a template first.');
    setIsDrafting(true);
    try {
      const res = await createAiDraft(rawId, tplId);
      form.setFieldsValue({
        content_name: res.content_name || 'Draft Post',
        niche: res.niche,
        platform: res.platforms,
        caption: res.caption,
        ...res.slides_data,
      });
      setLiveValues(form.getFieldsValue());
      message.success('Draft Generated!');
    } catch { message.error('Draft Error'); }
    finally { setIsDrafting(false); }
  };

  const onSave = async () => {
    try {
      const vals = await form.validateFields();
      const slides = (fullTemplate?.placeholders ?? []).reduce((acc: any, p: string) => { acc[p] = vals[p]; return acc; }, {});
      await apiClient.post('/data/content', {
        id: `post_${Date.now()}`,
        status: 'ready',
        niche: vals.niche,
        template: vals.template,
        data_json: JSON.stringify({ content_name: vals.content_name, platform: vals.platform, caption: vals.caption, slides }),
        raw_ref_id: selectedRaw?.id,
      });
      message.success('Post Pipeline Updated!');
    } catch { message.error('Validation Error'); }
  };

  const placeholders = fullTemplate?.placeholders ?? [];
  const groups: Record<string, string[]> = {};
  placeholders.forEach(p => {
    const k = p.split('_')[0] || 'MAIN';
    if (!groups[k]) groups[k] = [];
    groups[k].push(p);
  });

  return (
    <div style={{
      height: 'calc(100vh - 56px)',
      width: '100vw',
      display: 'flex',
      background: '#f8fafc',
      overflow: 'hidden',
    }}>
      {/* ── Panel 1: List (Nav) ── */}
      <div style={{ width: listCollapsed ? 48 : listWidth, transition: 'width 0.2s', background: '#fff', borderRight: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
          <Button type="text" size="small" icon={listCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setListCollapsed(!listCollapsed)} />
        </div>
        {!listCollapsed && <SourceBrowser items={rawItems} loading={loading} selected={selectedRaw} onSelect={setSelectedRaw} />}
      </div>
      {!listCollapsed && <div onMouseDown={() => { draggingRef.current = 'list'; document.body.style.cursor = 'col-resize'; }} style={{ width: 4, cursor: 'col-resize', zIndex: 100 }} />}

      {/* ── Panel 2: Inspector (Reader) ── */}
      <div style={{ width: inspectorWidth, background: '#fff', borderRight: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {selectedRaw ? (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
               <Title level={5} style={{ margin: 0, fontSize: 12 }}>READER</Title>
               <Button size="small" type="link" icon={<RobotOutlined />} onClick={() => onAiDraft(selectedRaw.id)} loading={isDrafting}>MAGIC DRAFT</Button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <Title level={4} style={{ fontSize: 18, marginBottom: 16 }}>{selectedRaw.title}</Title>
              {(() => {
                const p = parseJson(selectedRaw.data_json);
                const imgs = [...(p.local_images?.map((im: string) => getRawImageUrl(selectedRaw.id, im)) || []), ...(p.image_urls || [])];
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginBottom: 16 }}>
                       {imgs.slice(0, 4).map((src: string, i: number) => (
                         <div key={i} style={{ position: 'relative', cursor: 'copy' }} onClick={() => { navigator.clipboard.writeText(src); message.success('Img URL Copied'); }}>
                           <img src={src} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }} />
                         </div>
                       ))}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8, color: '#334155', background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                      {p.body || "No research text."}
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        ) : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="Select Article" /></div>}
      </div>
      <div onMouseDown={() => { draggingRef.current = 'inspector'; document.body.style.cursor = 'col-resize'; }} style={{ width: 4, cursor: 'col-resize', zIndex: 100 }} />

      {/* ── Panel 3: Editor (Workspace) ── */}
      <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', minWidth: 400 }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space><EditOutlined style={{ color: '#6366f1' }} /><Text strong>Authoring Studio</Text></Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={onSave} style={{ borderRadius: 6 }}>Save Changes</Button>
        </div>
        <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
          <Form form={form} layout="vertical" onValuesChange={(_, all) => setLiveValues(all)}>
            <div style={{ maxWidth: 720 }}>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="content_name" label="Public ID" required><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="niche" label="Focus Niche" required><NicheSelect value={form.getFieldValue('niche')} onChange={v => form.setFieldValue('niche', v)} /></Form.Item></Col>
                <Col span={8}><Form.Item name="template" label="Template" required><Select onChange={handleTemplateSelection}>{templates.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}</Select></Form.Item></Col>
              </Row>
              <Divider />
              {Object.entries(groups).map(([group, fields]) => (
                <div key={group} style={{ marginBottom: 32 }}>
                  <Text strong style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Section: {group}</Text>
                  {fields.map(field => {
                    const isImg = field.toUpperCase().includes('IMAGE');
                    return (
                      <Form.Item key={field} name={field} label={field.replace(`${group}_`, '')} style={{ marginTop: 12 }}>
                        {isImg ? <Input prefix={<PictureOutlined />} placeholder="Image URL..." /> : 
                         (field.includes('TEXT') || field.includes('BODY') ? <TextArea rows={2} autoSize={{ minRows: 2, maxRows: 6 }} /> : <Input />)}
                      </Form.Item>
                    );
                  })}
                </div>
              ))}
              <Form.Item name="caption" label="Social Caption"><TextArea rows={4} /></Form.Item>
            </div>
          </Form>
        </div>
      </div>

      <div onMouseDown={() => { draggingRef.current = 'preview'; document.body.style.cursor = 'col-resize'; }} style={{ width: 4, cursor: 'col-resize', zIndex: 100 }} />

      {/* ── Panel 4: Preview ── */}
      <div style={{ width: previewCollapsed ? 48 : previewWidth, transition: 'width 0.2s', background: '#f8fafc', borderLeft: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', background: '#fff' }}>
           <Button type="text" size="small" icon={previewCollapsed ? <LeftOutlined /> : <RightOutlined />} onClick={() => setPreviewCollapsed(!previewCollapsed)} />
        </div>
        {!previewCollapsed && (
          <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
            {Object.keys(groups).map((group, idx) => (
              <div key={group} style={{ background: fullTemplate?.colors?.primary || '#1e293b', color: fullTemplate?.colors?.text || '#fff', padding: 24, borderRadius: 16, marginBottom: 16, position: 'relative', overflow: 'hidden', minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {(() => {
                  const img = groups[group].find(f => f.toUpperCase().includes('IMAGE'));
                  const src = img ? liveValues[img] : null;
                  return src ? <img src={src} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} /> : null;
                })()}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {groups[group].map(f => !f.toUpperCase().includes('IMAGE') && (
                    <div key={f} style={{ marginBottom: 6 }}>
                       {f.includes('TITLE') ? <div style={{ fontSize: 16, fontWeight: 800 }}>{liveValues[f] || f}</div> : <div style={{ fontSize: 11, opacity: 0.9 }}>{liveValues[f] || '...'}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentStudio;
