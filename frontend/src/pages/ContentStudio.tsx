/**
 * pages/ContentStudio.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ULTIMATE WORKSPACE (Deep-Linking & Auto-Drafting Implementation)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Checkbox, Select, Button, Form, Input, Typography,
  Space, message, Tag, Divider, Spin, Empty, Row, Col,
} from 'antd';
import {
  EditOutlined, SaveOutlined, RobotOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, RightOutlined, LeftOutlined,
  PictureOutlined, GlobalOutlined
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
  selectedIds: string[];
  onToggle: (id: string) => void;
  onView: (item: RawContent) => void;
}> = ({ items, loading, selectedIds, onToggle, onView }) => {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filtered = items
    .filter(i => {
      const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) || 
                          i.source.toLowerCase().includes(search.toLowerCase());
      const matchSource = sourceFilter === 'all' || i.source === sourceFilter;
      return matchSearch && matchSource;
    })
    .sort((a, b) => {
      const d1 = new Date(a.scraped_at).getTime();
      const d2 = new Date(b.scraped_at).getTime();
      return sortOrder === 'newest' ? d2 - d1 : d1 - d2;
    });

  const sources = Array.from(new Set(items.map(i => i.source)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 6, flexDirection: 'column' }}>
        <Input.Search placeholder="Search research…" value={search} onChange={e => setSearch(e.target.value)} size="small" allowClear />
        <div style={{ display: 'flex', gap: 4 }}>
          <Select size="small" value={sourceFilter} onChange={setSourceFilter} style={{ flex: 2 }}>
             <Option value="all">Sources: ALL</Option>
             {sources.map(s => <Option key={s} value={s}>{s.toUpperCase()}</Option>)}
          </Select>
          <Select size="small" value={sortOrder} onChange={setSortOrder} style={{ flex: 1 }}>
             <Option value="newest">Latest</Option>
             <Option value="oldest">Oldest</Option>
          </Select>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
        {loading ? <div style={{ padding: 20, textAlign: 'center' }}><Spin size="small" /></div> : 
         filtered.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> :
         filtered.map(item => (
           <div key={item.id} style={{
             padding: '10px 14px', cursor: 'pointer',
             background: selectedIds.includes(item.id) ? '#eff6ff' : '#fff',
             borderBottom: '1px solid #f8fafc',
             display: 'flex', gap: 10, alignItems: 'flex-start'
           }}>
             <Checkbox checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} style={{ marginTop: 2 }} />
             <div onClick={() => onView(item)} style={{ flex: 1 }}>
               <div style={{ fontSize: 11, fontWeight: 500, color: '#1e293b', marginBottom: 2 }}>{item.title}</div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Tag color={SOURCE_COLORS[item.source]} style={{ fontSize: 8, margin: 0 }}>{item.source.toUpperCase()}</Tag>
                 <Text type="secondary" style={{ fontSize: 9 }}>{new Date(item.scraped_at).toLocaleDateString()}</Text>
               </div>
             </div>
           </div>
         ))}
      </div>
    </div>
  );
};

const ContentStudio: React.FC = () => {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const rawIdFromUrl = searchParams.get('rawId');

  const [rawItems, setRawItems] = useState<RawContent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedRawIds, setSelectedRawIds] = useState<string[]>([]);
  const [viewingRaw, setViewingRaw] = useState<RawContent | null>(null);
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
  const [suggestedStrategy, setSuggestedStrategy] = useState<any>(null);

  const draggingRef = useRef<string | null>(null);
  const hasAutoDrafted = useRef(false);

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

  const handleTemplateSelection = useCallback(async (tplId: string) => {
    try {
      const detail = await fetchTemplate(tplId);
      setFullTemplate(detail);
      form.setFieldValue('template', tplId);
    } catch { message.error('Template detail error'); }
  }, [form]);

  const handleAiDraft = useCallback(async (proMode: boolean = false) => {
    const tplId = form.getFieldValue('template');
    if (!tplId && !proMode) return message.warning('Select a design template first.');
    
    if (selectedRawIds.length === 0) {
      message.loading('Engaging AI Freedom Autopilot...', 2);
    }
    
    setIsDrafting(true);
    try {
      const res = await createAiDraft(selectedRawIds, tplId, proMode);
      
      // If AI created a new template, we should update the list or just use its ID
      if (res.template) {
        // Trigger template loading for the new ID
        await handleTemplateSelection(res.template);
      }

      // Phase 13: Capture AI Strategic Advice
      if (res.suggested_schema) {
          setSuggestedStrategy(res.suggested_schema);
      }
      
      form.setFieldsValue({
        content_name: res.content_name || 'Draft Post',
        niche: res.niche,
        template: res.template,
        platform: res.platforms || ['linkedin'],
        caption: res.caption,
        ...res.slides_data,
      });
      setLiveValues(form.getFieldsValue());
      message.success(proMode ? "AI designed a custom layout and synthesized content!" : `AI Synthesized from ${selectedRawIds.length} sources!`);
    } catch { message.error('Magic Draft failed.'); }
    finally { setIsDrafting(false); }
  }, [form, selectedRawIds, handleTemplateSelection]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([fetchRawData(), fetchTemplates()]);
      setRawItems(r);
      setTemplates(t);
      
      let initialTemplateId = t[0]?.id;
      if (initialTemplateId) {
        await handleTemplateSelection(initialTemplateId);
      }

      // Deep Link Logic
      if (rawIdFromUrl && !hasAutoDrafted.current) {
        const item = r.find(it => it.id === rawIdFromUrl);
        if (item) {
          setViewingRaw(item);
          setSelectedRawIds([item.id]);
          setTimeout(() => {
             handleAiDraft();
             hasAutoDrafted.current = true;
          }, 1000);
        }
      }
    } catch { message.error('Data loading error'); }
    finally { setLoading(false); }
  }, [rawIdFromUrl, handleTemplateSelection, handleAiDraft]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleSelect = (id: string) => {
    setSelectedRawIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const onSave = async () => {
    try {
      const vals = await form.validateFields();
      const slides = (fullTemplate?.placeholders ?? []).reduce((acc: any, p: string) => {
        acc[p] = vals[p];
        return acc;
      }, {});

      const payload = {
        id: `post_${Date.now()}`,
        status: 'ready',
        niche: vals.niche,
        template: vals.template,
        platform: vals.platform,
        caption: vals.caption,
        content_name: vals.content_name,
        slides: slides,
        raw_ref_ids: selectedRawIds,
      };
      await apiClient.post('/data/content', payload);
      message.success('Post saved to pipeline!');
    } catch (err) {
      console.error('Save failed:', err);
      message.error('Check required fields.');
    }
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
        {!listCollapsed && (
          <SourceBrowser 
            items={rawItems} 
            loading={loading} 
            selectedIds={selectedRawIds} 
            onToggle={handleToggleSelect} 
            onView={setViewingRaw} 
          />
        )}
      </div>
      {!listCollapsed && <div onMouseDown={() => { draggingRef.current = 'list'; document.body.style.cursor = 'col-resize'; }} style={{ width: 4, cursor: 'col-resize', zIndex: 100 }} />}

      {/* ── Panel 2: Inspector (Reader) ── */}
      <div style={{ width: inspectorWidth, background: '#fff', borderRight: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {viewingRaw ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <Title level={5} style={{ margin: 0, fontSize: 10, letterSpacing: 1, color: '#64748b' }}>
                 {selectedRawIds.length > 0 ? `RESEARCH INSPECTOR (${selectedRawIds.length})` : 'AI FREEDOM MODE'}
               </Title>
                <Space>
                   <Button 
                     size="small" 
                     className="pro-draft-btn"
                     icon={<PictureOutlined />} 
                     onClick={() => handleAiDraft(true)} 
                     loading={isDrafting}
                     style={{ 
                       fontSize: 10, 
                       borderColor: '#10b981', 
                       color: '#059669',
                       fontWeight: 600
                     }}
                   >
                     AUTO-DESIGN
                   </Button>
                   <Button 
                     size="small" 
                     type="primary" 
                     shape="round" 
                     icon={<RobotOutlined />} 
                     onClick={() => handleAiDraft(false)} 
                     loading={isDrafting} 
                     style={{ 
                       fontSize: 10, 
                       background: selectedRawIds.length === 0 ? '#10b981' : '#6366f1',
                       border: 'none'
                     }}
                   >
                     {selectedRawIds.length === 0 ? 'AI FREEDOM DRAFT' : 'MAGIC DRAFT'}
                   </Button>
                </Space>
            </div>
            {(() => {
                const p = parseJson(viewingRaw.data_json);
                const url = p.source_url || "";
                return (
                  <div style={{ padding: '6px 16px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: 8 }}>
                     <GlobalOutlined style={{ color: '#0369a1', fontSize: 12 }} />
                     <Text ellipsis style={{ fontSize: 10, color: '#0369a1', flex: 1 }}>{url}</Text>
                     <Button type="link" size="small" href={url} target="_blank" style={{ fontSize: 10, height: 20, padding: 0 }}>Review Site</Button>
                  </div>
                );
            })()}

            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <Title level={4} style={{ fontSize: 18, marginBottom: 20, fontWeight: 700, lineHeight: 1.4 }}>{viewingRaw.title}</Title>
              {(() => {
                const p = parseJson(viewingRaw.data_json);
                const imgs = [...(p.local_images?.map((im: string) => getRawImageUrl(viewingRaw.id, im)) || []), ...(p.image_urls || [])];
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
                       {imgs.slice(0, 10).map((src: string, i: number) => (
                         <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                           <img src={src} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                           <div style={{ padding: '6px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                              {placeholders.filter(p => p.includes('IMAGE')).map(p => (
                                <Button 
                                  key={p} 
                                  size="small" 
                                  type="text" 
                                  style={{ fontSize: 9, padding: '0 4px', height: 20, color: '#6366f1' }}
                                  onClick={() => {
                                    form.setFieldValue(p, src);
                                    setLiveValues(form.getFieldsValue());
                                    message.success(`Image applied to ${p}`);
                                  }}
                                >
                                  +{p.split('_')[0]}
                                </Button>
                              ))}
                           </div>
                         </div>
                       ))}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8, color: '#334155', background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                      {p.body || "No research text available for this item."}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="Select Article to View" /></div>}
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
              {suggestedStrategy && (
                <div style={{ marginBottom: 24, padding: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12 }}>
                  <Space><RobotOutlined style={{ color: '#0369a1' }} /><Text strong style={{ color: '#0369a1' }}>AI DESIGN STRATEGY</Text></Space>
                  <div style={{ marginTop: 8, fontSize: 13, color: '#0369a1' }}>
                    <b>Slide Blueprint:</b> {suggestedStrategy.optimal_slide_count} slides ({suggestedStrategy.best_visual_strategy})<br/>
                    <b>Strategic Rationale:</b> {suggestedStrategy.reason}
                  </div>
                </div>
              )}
              <Row gutter={16}>
                <Col span={8}><Form.Item name="content_name" label="Project Title (Internal)" required><Input placeholder="e.g. AI Strategy Post" /></Form.Item></Col>
                <Col span={8}><Form.Item name="niche" label="Niche" required><NicheSelect value={form.getFieldValue('niche')} onChange={v => form.setFieldValue('niche', v)} /></Form.Item></Col>
                <Col span={8}><Form.Item name="template" label="Design Template" required><Select onChange={handleTemplateSelection}>{templates.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}</Select></Form.Item></Col>
              </Row>
              <Form.Item name="platform" label="Publishing Platforms" initialValue={['linkedin']}>
                <Select mode="multiple">
                  <Option value="linkedin">LinkedIn Carousel</Option>
                  <Option value="instagram">Instagram Carousel</Option>
                  <Option value="tiktok">TikTok Slides</Option>
                </Select>
              </Form.Item>
              <Divider />
              {Object.entries(groups).map(([group, fields]) => (
                <div key={group} style={{ marginBottom: 32 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Tag color="blue" style={{ borderRadius: 4 }}>SECTION: {group}</Tag>
                      <Divider style={{ flex: 1, margin: 0 }} />
                   </div>
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
              <div key={idx} style={{ background: fullTemplate?.colors?.primary || '#1e293b', color: fullTemplate?.colors?.text || '#fff', padding: 24, borderRadius: 16, marginBottom: 16, position: 'relative', overflow: 'hidden', minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
