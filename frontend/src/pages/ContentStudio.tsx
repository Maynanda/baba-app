/**
 * pages/ContentStudio.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 3-panel FULL-SCREEN content authoring studio.
 *
 * Panel 1 (Left, collapsible)  → Source Browser + full-content inspector
 * Panel 2 (Middle)             → Slide editor (click chip to navigate slides)
 * Panel 3 (Right, collapsible) → LIVE slide preview (updates as you type)
 *
 * LIVE PREVIEW: Form onValuesChange fires on every keystroke → right panel
 *               re-renders immediately. No "Preview" button needed.
 *
 * CLICK TO EDIT: Clicking any slide card in the right panel navigates the
 *               middle panel to that slide's editing fields.
 *
 * SAVE: apiClient.post('/data/content', payload) — backend reads raw JSON
 *       body via Request.json() so there is no type mismatch.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Select, Button, Form, Input, Typography,
  Space, message, Tag, Divider, Spin, Empty, Tooltip, Badge,
} from 'antd';
import {
  EditOutlined, SaveOutlined, EyeOutlined,
  CopyOutlined, LinkOutlined, CalendarOutlined,
  LeftOutlined, RightOutlined,
} from '@ant-design/icons';
import apiClient from '../api/client';
import { fetchRawData } from '../api/dataService';
import {
  fetchTemplates, fetchTemplate,
  type Template, type TemplateDetail,
} from '../api/generatorService';
import type { RawContent } from '../types';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  rss: '#22c55e', blog: '#3b82f6', reddit: '#f97316',
  google_trends: '#eab308', portal: '#a855f7',
};

const SLIDE_GROUPS = [
  { key: 'hook',   label: '🪝 Hook',   fields: ['HOOK_TITLE', 'HOOK_SUB'] },
  { key: 'body_1', label: '① Body 1', fields: ['BODY_1_TITLE', 'BODY_1_TEXT'] },
  { key: 'body_2', label: '② Body 2', fields: ['BODY_2_TITLE', 'BODY_2_TEXT'] },
  { key: 'body_3', label: '③ Body 3', fields: ['BODY_3_TITLE', 'BODY_3_TEXT'] },
  { key: 'cta',   label: '📣 CTA',    fields: ['CTA_TITLE', 'CTA_TEXT'] },
];

const SLIDE_FIELD_MAP: Record<string, { title: string; text?: string }> = {
  hook:   { title: 'HOOK_TITLE',   text: 'HOOK_SUB' },
  body_1: { title: 'BODY_1_TITLE', text: 'BODY_1_TEXT' },
  body_2: { title: 'BODY_2_TITLE', text: 'BODY_2_TEXT' },
  body_3: { title: 'BODY_3_TITLE', text: 'BODY_3_TEXT' },
  cta:    { title: 'CTA_TITLE',    text: 'CTA_TEXT' },
};

function parseJson(s: string): Record<string, any> {
  try { return JSON.parse(s); } catch { return {}; }
}
function copyText(t: string) {
  navigator.clipboard.writeText(t);
  message.success('Copied!', 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel 1 — Source Browser
// ─────────────────────────────────────────────────────────────────────────────

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
  const parsed = selected ? parseJson(selected.data_json) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <Input.Search
        placeholder="Search articles…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        size="small"
        allowClear
      />

      {/* Scrollable list */}
      <div style={{
        overflowY: 'auto',
        flexShrink: 0,
        height: 260,
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        background: '#fff',
      }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center' }}><Spin size="small" /></div>
        ) : filtered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 12 }} />
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                borderLeft: `3px solid ${selected?.id === item.id
                  ? (SOURCE_COLORS[item.source] ?? '#1677ff') : 'transparent'}`,
                background: selected?.id === item.id ? '#eff6ff' : '#fff',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.35, marginBottom: 3 }}>
                {item.title.length > 62 ? item.title.slice(0, 62) + '…' : item.title}
              </div>
              <Space size={4}>
                <span style={{
                  fontSize: 10, padding: '1px 5px', borderRadius: 3, color: '#fff',
                  background: SOURCE_COLORS[item.source] ?? '#6b7280',
                }}>{item.source}</span>
                <Text type="secondary" style={{ fontSize: 10 }}>{item.niche}</Text>
              </Space>
            </div>
          ))
        )}
      </div>

      {/* Full content inspector */}
      {selected && parsed ? (
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 10 }}>
          {/* Title + copy */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            <Text strong style={{ fontSize: 12, lineHeight: 1.4 }}>
              {parsed.title || selected.title}
            </Text>
            <Tooltip title="Copy title">
              <Button type="text" size="small" icon={<CopyOutlined />}
                onClick={() => copyText(parsed.title || selected.title)} />
            </Tooltip>
          </div>
          <Space wrap size={4} style={{ marginTop: 5 }}>
            {parsed.source_url && (
              <a href={parsed.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11 }}>
                <LinkOutlined /> Source ↗
              </a>
            )}
            {parsed.published_date && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                <CalendarOutlined /> {new Date(parsed.published_date).toLocaleDateString()}
              </Text>
            )}
            {parsed.author && (
              <Text type="secondary" style={{ fontSize: 11 }}>by {parsed.author}</Text>
            )}
          </Space>

          {/* Keywords — click to copy */}
          {parsed.keywords?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>
                Keywords (click to copy)
              </Text>
              <Space wrap size={3}>
                {parsed.keywords.map((kw: string) => (
                  <Tag key={kw} style={{ fontSize: 10, cursor: 'pointer', margin: 1 }}
                    onClick={() => copyText(kw)}>{kw}</Tag>
                ))}
              </Space>
            </div>
          )}

          <Divider style={{ margin: '8px 0' }} />

          {/* Body */}
          {parsed.body && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text type="secondary" style={{ fontSize: 10 }}>Article Body</Text>
                <Tooltip title="Copy body">
                  <Button type="text" size="small" icon={<CopyOutlined />}
                    onClick={() => copyText(parsed.body)} />
                </Tooltip>
              </div>
              <div style={{
                fontSize: 11, lineHeight: 1.65, color: '#555',
                background: '#f9fafb', borderRadius: 4, padding: '8px 10px',
                whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto',
              }}>
                {parsed.body}
              </div>
            </>
          )}
        </div>
      ) : !loading && items.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px dashed #d1d5db', borderRadius: 6, color: '#9ca3af',
          fontSize: 12, height: 60, flexShrink: 0,
        }}>
          ↑ Click an article to inspect
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Panel 3 — Live Slide Preview (re-renders on every keystroke via liveValues)
// ─────────────────────────────────────────────────────────────────────────────

const SlideCard: React.FC<{
  slideType: string;
  slideLabel: string;
  index: number;
  values: Record<string, string>;
  colors: Record<string, string>;
  isActive: boolean;
  onClick: () => void;
}> = ({ slideType, slideLabel, index, values, colors, isActive, onClick }) => {
  const map = SLIDE_FIELD_MAP[slideType];
  const titleVal = map ? (values[map.title] ?? '') : '';
  const textVal  = map?.text ? (values[map.text] ?? '') : '';

  const bg     = colors?.background     ?? '#14191E';
  const accent = colors?.accent_primary ?? '#FF7F50';
  const fg     = colors?.text_primary   ?? '#F0F0F0';
  const sub    = colors?.text_secondary ?? '#AAAAAA';

  return (
    <div
      onClick={onClick}
      title={`Click to edit ${slideLabel}`}
      style={{
        aspectRatio: '1/1',
        background: bg,
        borderRadius: 7,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        cursor: 'pointer',
        border: `2px solid ${isActive ? accent : 'transparent'}`,
        boxShadow: isActive
          ? `0 0 0 3px ${accent}33`
          : '0 2px 10px rgba(0,0,0,0.35)',
        transition: 'border 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
    >
      {/* Slide label */}
      <div style={{
        position: 'absolute', top: 6, left: 10,
        fontSize: 8, color: sub, opacity: 0.55,
        textTransform: 'uppercase', letterSpacing: 1.2,
      }}>
        {String(index + 1).padStart(2, '0')} · {slideLabel}
      </div>

      {/* Accent line */}
      <div style={{ width: 18, height: 2, background: accent, marginBottom: 8, borderRadius: 1 }} />

      {/* Title */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: fg,
        lineHeight: 1.35, marginBottom: 5, wordBreak: 'break-word',
      }}>
        {titleVal || <span style={{ opacity: 0.2, fontStyle: 'italic' }}>Title here…</span>}
      </div>

      {/* Body text */}
      {map?.text && (
        <div style={{
          fontSize: 9, color: sub, lineHeight: 1.5, wordBreak: 'break-word',
        }}>
          {textVal || <span style={{ opacity: 0.2, fontStyle: 'italic' }}>Body text…</span>}
        </div>
      )}
    </div>
  );
};

const LivePreview: React.FC<{
  liveValues: Record<string, string>;
  templateDetail: TemplateDetail | null;
  activeSlide: string;
  onSlideClick: (key: string) => void;
}> = ({ liveValues, templateDetail, activeSlide, onSlideClick }) => {
  if (!templateDetail) return (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={<span style={{ color: '#64748b', fontSize: 11 }}>Select a template</span>}
      style={{ padding: 40 }} />
  );

  const slides = templateDetail.slides ?? [];
  const colors = templateDetail.colors ?? {};
  const hasAny = Object.values(liveValues).some(v => !!v);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!hasAny && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', padding: '4px 0 8px' }}>
          Start typing in the editor → slides update live
        </div>
      )}
      {slides.map((slide, i) => {
        const group = SLIDE_GROUPS.find(g => g.key === slide.type);
        return (
          <SlideCard
            key={slide.type}
            slideType={slide.type}
            slideLabel={group?.label ?? slide.type}
            index={i}
            values={liveValues}
            colors={colors}
            isActive={slide.type === activeSlide}
            onClick={() => onSlideClick(slide.type)}
          />
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Panel 2 — Slide Editor (chip navigation + form)
// ─────────────────────────────────────────────────────────────────────────────

const SlideEditor: React.FC<{
  templateDetail: TemplateDetail | null;
  templateLoading: boolean;
  activeSlide: string;
  onSlideChange: (key: string) => void;
  onValuesChange: (values: Record<string, string>) => void;
  onSave: (values: Record<string, string>) => Promise<void>;
  saving: boolean;
  selectedRaw: RawContent | null;
}> = ({ templateDetail, templateLoading, activeSlide, onSlideChange, onValuesChange, onSave, saving, selectedRaw }) => {
  const [form] = Form.useForm<Record<string, string>>();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
      form.resetFields();
      onValuesChange({});
    } catch {
      // Ant Design highlights invalid fields automatically
    }
  };

  if (templateLoading) return (
    <div style={{ padding: 40, textAlign: 'center' }}><Spin tip="Loading template…" /></div>
  );
  if (!templateDetail) return (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="Select a template to start" style={{ marginTop: 40 }} />
  );

  const available = new Set(templateDetail.placeholders ?? []);
  const activeGroup = SLIDE_GROUPS.find(g => g.key === activeSlide);
  const availableGroups = SLIDE_GROUPS.filter(g => g.fields.some(f => available.has(f)));

  return (
    <Form
      form={form}
      layout="vertical"
      size="small"
      onValuesChange={(_, all) => onValuesChange(all)}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Template badge */}
      <div style={{ marginBottom: 10 }}>
        <Space size={6} wrap>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
            background: templateDetail.colors?.accent_primary ?? '#888',
          }} />
          <Text style={{ fontSize: 12, fontWeight: 600 }}>{templateDetail.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {templateDetail.aspect_ratio} · {templateDetail.platforms?.join(', ')}
          </Text>
          {selectedRaw && (
            <Badge status="processing"
              text={<Text style={{ fontSize: 10, color: '#6b7280' }}>ref: {selectedRaw.id.slice(0, 20)}…</Text>} />
          )}
        </Space>
      </div>

      {/* Slide navigation chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {availableGroups.map(g => (
          <div
            key={g.key}
            onClick={() => onSlideChange(g.key)}
            style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              cursor: 'pointer',
              background: g.key === activeSlide ? '#1d4ed8' : '#f1f5f9',
              color: g.key === activeSlide ? '#fff' : '#475569',
              fontWeight: g.key === activeSlide ? 600 : 400,
              transition: 'all 0.15s',
              userSelect: 'none',
            }}
          >
            {g.label}
          </div>
        ))}
      </div>

      {/* Active slide heading */}
      {activeGroup && (
        <div style={{
          padding: '6px 12px', background: '#eff6ff',
          borderLeft: '3px solid #1d4ed8', borderRadius: 4,
          marginBottom: 12,
        }}>
          <Text strong style={{ fontSize: 13 }}>{activeGroup.label}</Text>
        </div>
      )}

      {/* Form fields */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeGroup?.fields
          .filter(f => available.has(f))
          .map(placeholder => {
            const isLong = placeholder.endsWith('_TEXT') || placeholder.endsWith('_SUB');
            const label = placeholder
              .replace(/_TEXT$/, ' body').replace(/_TITLE$/, ' title')
              .replace(/_SUB$/, ' subtitle').replace(/_/g, ' ').toLowerCase();
            return (
              <Form.Item
                key={placeholder}
                name={placeholder}
                label={<Text style={{ fontSize: 12, textTransform: 'capitalize' }}>{label}</Text>}
                rules={[{ required: true, message: 'Required' }]}
              >
                {isLong
                  ? <TextArea rows={4} placeholder={`Write ${label}…`}
                      showCount maxLength={280} style={{ resize: 'none' }} />
                  : <Input placeholder={`Write ${label}…`} maxLength={80} showCount />
                }
              </Form.Item>
            );
          })}
      </div>

      {/* Save metadata + actions */}
      <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
        <Form.Item
          name="__content_name"
          label={<Text style={{ fontSize: 12 }}>Content Name <Text type="secondary" style={{ fontSize: 11 }}>(for your reference)</Text></Text>}
          rules={[{ required: true, message: 'Give this post a name' }]}
        >
          <Input placeholder="e.g. AI Agents 101 – Hook + 3 bodies" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="__platforms"
          label={<Text style={{ fontSize: 12 }}>Publish to Platforms</Text>}
          initialValue={templateDetail?.platforms ?? ['linkedin']}
        >
          <Select
            mode="multiple"
            placeholder="Select platforms…"
            style={{ width: '100%' }}
            options={[
              { label: '💼 LinkedIn', value: 'linkedin' },
              { label: '📸 Instagram Feed', value: 'instagram_feed' },
              { label: '📱 Instagram Story', value: 'instagram_story' },
              { label: '🎵 TikTok', value: 'tiktok' },
            ]}
          />
        </Form.Item>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          block
          size="middle"
        >
          Save to Content Pipeline
        </Button>
      </div>
    </Form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const ContentStudio: React.FC = () => {
  const [rawItems, setRawItems]             = useState<RawContent[]>([]);
  const [templates, setTemplates]           = useState<Template[]>([]);
  const [templateDetail, setTemplateDetail] = useState<TemplateDetail | null>(null);
  const [selectedRaw, setSelectedRaw]       = useState<RawContent | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>();
  const [activeSlide, setActiveSlide]       = useState<string>('hook');
  const [liveValues, setLiveValues]         = useState<Record<string, string>>({});

  const [rawLoading, setRawLoading]           = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [saving, setSaving]                   = useState(false);

  const [sourceCollapsed, setSourceCollapsed]   = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  // Load data on mount
  useEffect(() => {
    setRawLoading(true);
    Promise.all([fetchRawData(), fetchTemplates()])
      .then(([raw, tmpl]) => {
        setRawItems(raw);
        setTemplates(tmpl);
        if (tmpl.length > 0) setSelectedTemplate(tmpl[0].id);
      })
      .catch(() => message.error('Failed to load. Is the API running?'))
      .finally(() => setRawLoading(false));
  }, []);

  // Load template detail when changed
  useEffect(() => {
    if (!selectedTemplate) return;
    setTemplateLoading(true);
    setLiveValues({});
    fetchTemplate(selectedTemplate)
      .then(setTemplateDetail)
      .catch(() => message.error('Failed to load template.'))
      .finally(() => setTemplateLoading(false));
  }, [selectedTemplate]);

  // Save post to pipeline
  const handleSave = useCallback(async (values: Record<string, any>) => {
    if (!templateDetail) return;
    setSaving(true);
    try {
      // Extract metadata fields (prefixed with __) from slide content fields
      const contentName  = values['__content_name'] ?? '';
      const platforms    = values['__platforms'] ?? templateDetail.platforms ?? [];

      // Build slide data — only include real placeholder keys
      const slides = templateDetail.slides?.map(slide => {
        const entry: Record<string, string> = { type: slide.type };
        templateDetail.placeholders?.forEach(ph => {
          if (values[ph]) entry[ph] = values[ph];
        });
        return entry;
      }) ?? [];

      const postId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const payload = {
        id: postId,
        content_name: contentName,
        status: 'draft',
        niche: selectedRaw?.niche ?? 'ai-engineering',
        template: templateDetail.id,
        platform: platforms,
        source_url: selectedRaw ? (parseJson(selectedRaw.data_json).source_url ?? '') : '',
        raw_ref_id: selectedRaw?.id ?? null,
        slides,
        created_by: 'content_studio',
      };

      await apiClient.post('/data/content', payload);
      message.success(`✅ Saved! Draft ID: ${postId}`, 6);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.message ?? 'unknown error';
      message.error(`❌ Save failed: ${detail}`, 6);
    } finally {
      setSaving(false);
    }
  }, [templateDetail, selectedRaw]);

  return (
    // Full-screen layout — fills the viewport height below the header
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 52px)',
      margin: '-20px -24px',     // cancel parent Content padding
      overflow: 'hidden',
    }}>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
      }}>
        <Space>
          <EditOutlined />
          <Text strong style={{ fontSize: 15 }}>Content Studio</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Source → Write → Preview Live → Save
          </Text>
        </Space>
        <Space>
          <Text style={{ fontSize: 12 }}>Template:</Text>
          <Select
            value={selectedTemplate}
            onChange={v => { setSelectedTemplate(v); setLiveValues({}); }}
            style={{ width: 210 }}
            size="small"
          >
            {templates.map(t => (
              <Option key={t.id} value={t.id}>
                {t.name}
                <Tag style={{ marginLeft: 6, fontSize: 10 }}>{t.aspect_ratio}</Tag>
              </Option>
            ))}
          </Select>
        </Space>
      </div>

      {/* ── 3-panel body ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Panel 1 — Source */}
        <div style={{
          width: sourceCollapsed ? 36 : 300,
          minWidth: sourceCollapsed ? 36 : 300,
          transition: 'width 0.2s, min-width 0.2s',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 10px', borderBottom: '1px solid #e5e7eb', flexShrink: 0,
          }}>
            {!sourceCollapsed && (
              <Space size={4}>
                <EyeOutlined style={{ color: '#6b7280' }} />
                <Text strong style={{ fontSize: 12 }}>Source</Text>
                <Tag style={{ fontSize: 10 }}>{rawItems.length}</Tag>
              </Space>
            )}
            <Button
              type="text" size="small"
              icon={sourceCollapsed ? <RightOutlined /> : <LeftOutlined />}
              onClick={() => setSourceCollapsed(c => !c)}
              style={{ marginLeft: 'auto' }}
            />
          </div>
          {/* Content */}
          {!sourceCollapsed && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              <SourceBrowser
                items={rawItems}
                loading={rawLoading}
                selected={selectedRaw}
                onSelect={setSelectedRaw}
              />
            </div>
          )}
        </div>

        {/* Panel 2 — Editor */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#f8fafc',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '6px 12px', borderBottom: '1px solid #e5e7eb',
            background: '#fff', flexShrink: 0,
          }}>
            <Space size={4}>
              <EditOutlined style={{ color: '#6b7280' }} />
              <Text strong style={{ fontSize: 12 }}>Write Content</Text>
            </Space>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            <SlideEditor
              templateDetail={templateDetail}
              templateLoading={templateLoading}
              activeSlide={activeSlide}
              onSlideChange={setActiveSlide}
              onValuesChange={setLiveValues}
              onSave={handleSave}
              saving={saving}
              selectedRaw={selectedRaw}
            />
          </div>
        </div>

        {/* Panel 3 — Live Preview */}
        <div style={{
          width: previewCollapsed ? 36 : 300,
          minWidth: previewCollapsed ? 36 : 300,
          transition: 'width 0.2s, min-width 0.2s',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 10px', borderBottom: '1px solid #1e293b', flexShrink: 0,
          }}>
            <Button
              type="text" size="small"
              icon={previewCollapsed ? <LeftOutlined /> : <RightOutlined />}
              style={{ color: '#64748b' }}
              onClick={() => setPreviewCollapsed(c => !c)}
            />
            {!previewCollapsed && (
              <Space size={4}>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                  Live Preview
                </Text>
                {Object.values(liveValues).some(v => !!v) && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#22c55e', display: 'inline-block',
                  }} />
                )}
              </Space>
            )}
          </div>
          {!previewCollapsed && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              <LivePreview
                liveValues={liveValues}
                templateDetail={templateDetail}
                activeSlide={activeSlide}
                onSlideClick={setActiveSlide}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ContentStudio;
