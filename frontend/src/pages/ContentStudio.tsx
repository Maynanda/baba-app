/**
 * pages/ContentStudio.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ULTIMATE WORKSPACE (Deep-Linking & Auto-Drafting Implementation)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Checkbox, Select, Button, Form, Input, Typography,
  message, Tag, Divider, Spin, Empty, Row, Col,
} from 'antd';
import {
  SaveOutlined, RobotOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, RightOutlined, LeftOutlined,
  PictureOutlined, DeleteOutlined
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

const NicheSelect: React.FC<{ value?: string; onChange?: (v: string) => void }> = ({ value, onChange }) => (
  <Select
    mode="tags"
    placeholder="Niche"
    value={value ? [value] : []}
    onChange={(vals) => onChange?.(vals[vals.length - 1])}
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

const SidebarTab: React.FC<{ active: 'research' | 'pipeline', onChange: (t: 'research' | 'pipeline') => void }> = ({ active, onChange }) => (
  <div style={{ padding: '0 8px 8px 8px', display: 'flex', gap: 4 }}>
    <Button 
      size="small" 
      type={active === 'research' ? 'primary' : 'text'} 
      onClick={() => onChange('research')}
      style={{ flex: 1, fontSize: 10 }}
    >
      RESEARCH
    </Button>
    <Button 
      size="small" 
      type={active === 'pipeline' ? 'primary' : 'text'} 
      onClick={() => onChange('pipeline')}
      style={{ flex: 1, fontSize: 10 }}
    >
      PIPELINE
    </Button>
  </div>
);

const PipelineBrowser: React.FC<{
  items: any[];
  onLoad: (post: any) => void;
  onDelete: (id: string) => void;
}> = ({ items, onLoad, onDelete }) => (
  <div style={{ flex: 1, overflowY: 'auto' }}>
    {items.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No saved drafts" /> :
     items.map(post => (
       <div key={post.id} style={{
         padding: '10px 14px', cursor: 'pointer',
         borderBottom: '1px solid #f8fafc',
         display: 'flex', justifyContent: 'space-between', alignItems: 'center'
       }}>
         <div style={{ flex: 1 }} onClick={() => onLoad(post)}>
           <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{post.content_name || post.id}</div>
           <div style={{ fontSize: 9, color: '#64748b' }}>{post.template} • {new Date(post.updated_at).toLocaleDateString()}</div>
         </div>
         <Button 
           size="small" 
           type="text" 
           danger 
           icon={<DeleteOutlined style={{ fontSize: 10 }} />} 
           onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} 
         />
       </div>
     ))}
  </div>
);

const ContentStudio: React.FC = () => {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const rawIdFromUrl = searchParams.get('rawId');

  const [sidebarTab, setSidebarTab] = useState<'research' | 'pipeline'>('research');
  const [rawItems, setRawItems] = useState<RawContent[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  
  const [selectedRawIds, setSelectedRawIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [viewingRaw, setViewingRaw] = useState<RawContent | null>(null);
  const [fullTemplate, setFullTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [liveValues, setLiveValues] = useState<any>({});
  
  const [aiIntent, setAiIntent] = useState('');

  // Panel States
  const [listCollapsed, setListCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  const handleTemplateSelection = useCallback(async (tplId: string) => {
    try {
      const detail = await fetchTemplate(tplId);
      setFullTemplate(detail);
      form.setFieldValue('template', tplId);
    } catch { message.error('Template detail error'); }
  }, [form]);

  const handleAiDraft = useCallback(async (intentOverride?: string) => {
    const tplId = form.getFieldValue('template') || "carousel_dark_1x1";
    const description = intentOverride || aiIntent;
    
    setIsDrafting(true);
    try {
      console.log("[Studio] Starting Magic Draft...", { selectedRawIds, tplId, description });
      const res = await createAiDraft(selectedRawIds, tplId, true, description);
      
      if (!res) {
        throw new Error("AI returned no draft data.");
      }

      console.log("[Studio] Magic Draft Received:", res);
      
      if (res.template) await handleTemplateSelection(res.template);
      
      // Map basic fields
      const updateData: any = {
        content_name: res.content_name || 'AI Generated Blueprint',
        niche: res.niche || 'AI Engineering',
        template: res.template || tplId,
        platforms: res.platforms || ['linkedin'],
        caption: res.caption || '',
      };

      // Spread slides data (flattened or nested)
      const slides = res.slides_data || res.slides || {};
      Object.assign(updateData, slides);

      form.setFieldsValue(updateData);
      setLiveValues(form.getFieldsValue());
      
      message.success("AI Content Architect has drafted your blueprint!");
    } catch (err: any) {
      console.error("[Studio] AI Drafting Error:", err);
      message.error(`Drafting failed: ${err.message || 'Unknown Error'}`);
    } finally {
      setIsDrafting(false);
    }
  }, [form, selectedRawIds, aiIntent, handleTemplateSelection]);

  const handleLoadPost = useCallback(async (post: any) => {
    setLoading(true);
    try {
      setEditingId(post.id);
      const detail = await fetchTemplate(post.template);
      setFullTemplate(detail);
      
      const dataStr = typeof post.data_json === 'string' ? post.data_json : JSON.stringify(post.data_json);
      const data = JSON.parse(dataStr);
      
      if (data.raw_ref_ids && Array.isArray(data.raw_ref_ids)) {
        setSelectedRawIds(data.raw_ref_ids);
      }

      form.setFieldsValue({
        content_name: post.content_name,
        niche: post.niche,
        template: post.template,
        platform: JSON.parse(post.platforms || '["linkedin"]'),
        caption: post.caption,
        ...(data.slides_data || {})
      });
      setLiveValues(form.getFieldsValue());
      message.info(`Loaded draft: ${post.content_name}`);
    } catch (e) {
      console.error(e);
      message.error('Failed to load post data');
    } finally {
      setLoading(false);
    }
  }, [form]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t, p] = await Promise.all([
        fetchRawData(), 
        fetchTemplates(),
        apiClient.get('/data/content').then(res => res.data.data)
      ]);
      setRawItems(r);
      setTemplates(t);
      setSavedPosts(p);
      
      if (t[0] && !editingId) await handleTemplateSelection(t[0].id);

      if (rawIdFromUrl) {
        const item = r.find(it => it.id === rawIdFromUrl);
        if (item) {
          setViewingRaw(item);
          setSelectedRawIds([item.id]);
        }
      }
    } catch { message.error('Data loading error'); }
    finally { setLoading(false); }
  }, [rawIdFromUrl, handleTemplateSelection, editingId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onSave = async () => {
    try {
      const vals = await form.validateFields();
      const slides = (fullTemplate?.placeholders ?? []).reduce((acc: any, p: string) => {
        acc[p] = vals[p];
        return acc;
      }, {});

      const payload = {
        id: editingId || `post_${Date.now()}`,
        status: 'ready',
        niche: vals.niche,
        template: vals.template,
        platform: vals.platform,
        caption: vals.caption,
        content_name: vals.content_name,
        slides_data: slides,
        slides: slides,
        raw_ref_ids: selectedRawIds,
      };
      await apiClient.post('/data/content', payload);
      message.success(editingId ? 'Draft updated!' : 'Post saved!');
      loadData();
    } catch (err) {
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
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', background: '#f8fafc', overflow: 'hidden' }}>
      {/* LEFT: LIBRARY */}
      <div style={{ width: listCollapsed ? 48 : 260, transition: 'width 0.2s', background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
          {!listCollapsed && <Text strong style={{ fontSize: 11, letterSpacing: 1 }}>LIBRARY</Text>}
          <Button type="text" size="small" icon={listCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setListCollapsed(!listCollapsed)} />
        </div>
        {!listCollapsed && (
          <>
            <SidebarTab active={sidebarTab} onChange={setSidebarTab} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {sidebarTab === 'research' ? (
                <SourceBrowser items={rawItems} loading={loading} selectedIds={selectedRawIds} onToggle={(id) => setSelectedRawIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} onView={setViewingRaw} />
              ) : (
                <PipelineBrowser items={savedPosts} onLoad={handleLoadPost} onDelete={async (id) => { await apiClient.delete(`/data/content/${id}`); loadData(); }} />
              )}
            </div>
          </>
        )}
      </div>

      {/* CENTER: ARCHITECT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TOP: AI ORCHESTRATOR */}
        <div style={{ padding: '20px 40px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          <Title level={5} style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>TALK WITH AI (CONTENT ARCHITECT)</Title>
          <div style={{ display: 'flex', gap: 12 }}>
            <Input 
              size="large" 
              placeholder="What should we build today?"
              value={aiIntent}
              onChange={e => setAiIntent(e.target.value)}
              onPressEnter={() => handleAiDraft()}
              prefix={<RobotOutlined style={{ color: '#6366f1' }} />}
              style={{ borderRadius: 8 }}
            />
            <Button size="large" type="primary" icon={<RobotOutlined />} onClick={() => handleAiDraft()} loading={isDrafting} style={{ borderRadius: 8, background: '#6366f1' }}>
              Magic Draft
            </Button>
          </div>
          {selectedRawIds.length > 0 && (
             <div style={{ marginTop: 8 }}>
               <Text type="secondary" style={{ fontSize: 11 }}>Using context from <b>{selectedRawIds.length} selected items</b>. Clear them to let AI search autonomously.</Text>
             </div>
          )}
        </div>

        {/* WORKSPACE */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* INSPECTOR (Research Intelligence) */}
          {viewingRaw && (
            <div style={{ width: 360, background: '#f8fafc', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: 20 }}>
               <Title level={5} style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, marginBottom: 16 }}>RESEARCH INSPECTOR</Title>
               <Title level={4} style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, lineHeight: 1.4 }}>{viewingRaw.title}</Title>
               
               {/* VISUAL ASSETS GRID */}
               {(() => {
                 const p = parseJson(viewingRaw.data_json);
                 const imgs = [
                   ...(p.local_images?.map((im: string) => getRawImageUrl(viewingRaw.id, im)) || []),
                   ...(p.image_urls || [])
                 ];
                 
                 if (imgs.length === 0) return null;
                 
                 return (
                   <div style={{ marginBottom: 24 }}>
                     <Text strong style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 8 }}>EXTRACTED ASSETS ({imgs.length})</Text>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                       {imgs.slice(0, 10).map((src: string, i: number) => (
                         <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                           <img src={src} style={{ width: '100%', height: 90, objectFit: 'cover' }} alt="Asset" />
                           <div style={{ padding: '4px', background: 'rgba(255,255,255,0.95)', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                             {placeholders.filter(p => p.includes('IMAGE')).map(p => (
                               <Button 
                                 key={p} 
                                 size="small" 
                                 type="text" 
                                 style={{ fontSize: 8, padding: '0 4px', height: 18, color: '#6366f1', fontWeight: 600 }}
                                 onClick={() => {
                                   form.setFieldValue(p, src);
                                   setLiveValues(form.getFieldsValue());
                                   message.success(`Applied to ${p}`);
                                 }}
                               >
                                 +{p.split('_')[0]}
                               </Button>
                             ))}
                           </div>
                         </div>
                       ))}
                     </div>
                     <Divider style={{ margin: '20px 0' }} />
                   </div>
                 );
               })()}

               <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                 {parseJson(viewingRaw.data_json).body || "No textual context extracted for this source."}
               </div>
            </div>
          )}

          {/* EDITOR */}
          <div style={{ flex: 1, padding: '32px 60px', overflowY: 'auto', background: '#fff' }}>
            <Form form={form} layout="vertical" onValuesChange={(_, all) => setLiveValues(all)}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                 <Title level={4} style={{ margin: 0 }}>Slide Blueprint</Title>
                 <Button type="primary" icon={<SaveOutlined />} onClick={onSave}>{editingId ? 'Update Draft' : 'Save Pipeline'}</Button>
               </div>
               <Row gutter={16}>
                <Col span={12}><Form.Item name="content_name" label="Project Title"><Input /></Form.Item></Col>
                <Col span={6}><Form.Item name="template" label="Template"><Select onChange={handleTemplateSelection}>{templates.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}</Select></Form.Item></Col>
                <Col span={6}><Form.Item name="niche" label="Niche"><NicheSelect /></Form.Item></Col>
               </Row>
               <Divider />
               {Object.entries(groups).map(([group, fields]) => (
                 <div key={group} style={{ marginBottom: 20 }}>
                   <Tag color="blue" style={{ marginBottom: 12 }}>SECTION: {group}</Tag>
                   {fields.map(field => {
                     const isImg = field.toUpperCase().includes('IMAGE');
                     return (
                       <Form.Item key={field} name={field} label={field.replace(`${group}_`, '')}>
                         {isImg ? <Input prefix={<PictureOutlined />} /> : (field.includes('TEXT') || field.includes('BODY') ? <TextArea autoSize /> : <Input />)}
                       </Form.Item>
                     );
                   })}
                 </div>
               ))}
               <Form.Item name="caption" label="Social Caption"><TextArea rows={4} /></Form.Item>
            </Form>
          </div>
        </div>
      </div>

      {/* RIGHT: PREVIEW */}
      <div style={{ width: previewCollapsed ? 48 : 340, transition: 'width 0.2s', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
          <Button type="text" size="small" icon={previewCollapsed ? <LeftOutlined /> : <RightOutlined />} onClick={() => setPreviewCollapsed(!previewCollapsed)} />
        </div>
        {!previewCollapsed && (
          <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
            {Object.keys(groups).map((group, idx) => (
              <div key={idx} style={{ background: fullTemplate?.colors?.primary || '#1e293b', color: fullTemplate?.colors?.text || '#fff', padding: 24, borderRadius: 16, marginBottom: 16, minHeight: 220, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {(() => {
                  const img = groups[group].find(f => f.toUpperCase().includes('IMAGE'));
                  const src = img ? liveValues[img] : null;
                  return src ? (
                    <img 
                      src={src} 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }} 
                      alt="Slide Background"
                    />
                  ) : null;
                })()}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {groups[group].map(f => !f.toUpperCase().includes('IMAGE') && (
                    <div key={f} style={f.includes('TITLE') ? { fontSize: 16, fontWeight: 800 } : { fontSize: 11, opacity: 0.9, marginTop: 4 }}>{liveValues[f] || (f.includes('TITLE') ? f : '...')}</div>
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
