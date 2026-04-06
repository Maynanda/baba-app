/**
 * pages/TemplateStudio.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Template Designer & Editor.
 * Create new PPTX template definitions or customize colors/placeholders.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Row, Col, Card, List, Button, Tag, Space, 
  Form, Input, Select, message, Tabs, Empty, Spin, 
  Typography as AntTypography, Alert 
} from 'antd';
import { 
  FormatPainterOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  BgColorsOutlined,
  BuildOutlined
} from '@ant-design/icons';
import { fetchTemplates, fetchTemplate, saveTemplate, type TemplateDetail } from '../api/generatorService';

const { Title, Text } = AntTypography;
const { Option } = Select;

const ASPECT_RATIOS = [
  { label: '9:16 (Story/TikTok)', value: '9:16' },
  { label: '4:5 (Portrait Feed)', value: '4:5' },
  { label: '1:1 (Square)', value: '1:1' },
];

const TemplateStudio: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<TemplateDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTemplates();
      setTemplates(data);
    } catch {
      message.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const loadSpecificTemplate = async (id: string) => {
    setLoading(true);
    try {
      const detail = await fetchTemplate(id);
      setActiveTemplate(detail);
      form.setFieldsValue({
        ...detail,
        placeholders: detail.placeholders.join(', '),
        platforms: detail.platforms,
      });
    } catch {
      message.error('Failed to load template details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadSpecificTemplate(selectedId);
    }
  }, [selectedId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateNew = () => {
    const newId = `T-NEW-${Math.floor(Math.random() * 1000)}`;
    const newTpl: TemplateDetail = {
      id: newId,
      name: 'New Template',
      aspect_ratio: '4:5',
      platforms: ['linkedin'],
      niche: ['ai_engineering'],
      description: 'Customizable template',
      placeholders: ['HOOK_TITLE', 'BODY_TEXT'],
      slides: [{ index: 0, type: 'hook' }],
      colors: { primary: '#1677ff', secondary: '#f0f0f0', text: '#000000' },
      status: 'draft'
    };
    setSelectedId(null);
    setActiveTemplate(newTpl);
    form.setFieldsValue({
      ...newTpl,
      placeholders: newTpl.placeholders.join(', ')
    });
  };

  const onFinish = async (values: any) => {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      // Re-format placeholders back to array
      const placeholders = typeof values.placeholders === 'string' 
        ? values.placeholders.split(',').map((s: string) => s.trim()).filter(Boolean)
        : values.placeholders;

      const payload: TemplateDetail = {
        ...activeTemplate,
        ...values,
        placeholders,
      };

      await saveTemplate(payload);
      message.success(`Template ${payload.id} saved successfully!`);
      loadTemplates();
      setSelectedId(payload.id);
    } catch (err: any) {
      message.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <FormatPainterOutlined style={{ marginRight: 12 }} />
          Template Studio
        </Title>
        <Text type="secondary">
          Configure visual schemas for your (.pptx) designs. Map placeholders to field types and manage colors.
        </Text>
      </div>

      <Row gutter={24}>
        {/* Left: Library */}
        <Col xs={24} md={6}>
          <Card 
            title="Registry" 
            size="small"
            extra={<Button icon={<PlusOutlined />} size="small" onClick={handleCreateNew}>New</Button>}
          >
            {loading && !templates.length ? <Spin /> : (
              <List
                dataSource={templates}
                renderItem={(t: any) => (
                  <List.Item 
                    onClick={() => setSelectedId(t.id)}
                    style={{ 
                      cursor: 'pointer', 
                      background: selectedId === t.id ? '#f0f7ff' : 'transparent',
                      padding: '8px 12px',
                      borderRadius: 4,
                      borderLeft: `4px solid ${selectedId === t.id ? '#1677ff' : 'transparent'}`,
                      marginBottom: 4,
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <Text strong style={{ fontSize: 13 }}>{t.name}</Text>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <Tag style={{ fontSize: 10 }}>{t.id}</Tag>
                        <Tag color="blue" style={{ fontSize: 10 }}>{t.aspect_ratio}</Tag>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Right: Editor */}
        <Col xs={24} md={18}>
          {activeTemplate ? (
            <Form 
              form={form} 
              layout="vertical" 
              onFinish={onFinish}
              initialValues={activeTemplate}
            >
              <Card 
                title={`Editing: ${activeTemplate.name}`} 
                size="small"
                extra={
                  <Space>
                    <Button icon={<SaveOutlined />} type="primary" htmlType="submit" loading={saving}>Save Template</Button>
                  </Space>
                }
              >
                <Tabs defaultActiveKey="basic">
                  <Tabs.TabPane tab={<span><BuildOutlined /> Schema</span>} key="basic">
                    <Row gutter={24}>
                      <Col span={12}>
                        <Form.Item name="id" label="Internal Template ID" required rules={[{ required: true }]}>
                          <Input placeholder="e.g. T-LIGHT-01" disabled={!!selectedId} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="name" label="Public Name" required>
                          <Input placeholder="The Minimalist Light" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={24}>
                      <Col span={8}>
                        <Form.Item name="aspect_ratio" label="Aspect Ratio">
                          <Select options={ASPECT_RATIOS} />
                        </Form.Item>
                      </Col>
                      <Col span={16}>
                        <Form.Item name="platforms" label="Support Platforms">
                          <Select mode="multiple" placeholder="Select targets">
                            <Option value="linkedin">LinkedIn PDF</Option>
                            <Option value="instagram_feed">Instagram Feed (Portrait)</Option>
                            <Option value="instagram_story">Instagram Story</Option>
                            <Option value="tiktok">TikTok Slideshow</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item 
                      name="placeholders" 
                      label="PPTX Placeholders (Comma separated)" 
                      extra="The exact names of the text-box placeholders in your .pptx file"
                    >
                      <Input.TextArea placeholder="HOOK_TITLE, BODY_TITLE, BODY_TEXT, CTA..." />
                    </Form.Item>

                    <Alert 
                      type="info" 
                      showIcon 
                      icon={<InfoCircleOutlined />}
                      message="Important Instructions"
                      description={
                        <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
                          <li>The ID must match the folder name in <code>/templates/[id]/</code>.</li>
                          <li>You MUST place a <code>template.pptx</code> file in that folder for generation to work.</li>
                          <li>Placeholder names are CASE SENSITIVE.</li>
                        </ul>
                      }
                    />
                  </Tabs.TabPane>

                  <Tabs.TabPane tab={<span><BgColorsOutlined /> Theme & Palette</span>} key="colors">
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                      These colors are used by the <b>Content Studio Live Preview</b> to mockup your design.
                    </Text>
                    
                    <Row gutter={[32, 24]}>
                      <Col span={12}>
                        <Form.Item label="Primary Color (Brand)" name={['colors', 'primary']}>
                          <Input type="color" style={{ height: 40 }} />
                        </Form.Item>
                        <Form.Item label="Secondary Color" name={['colors', 'secondary']}>
                          <Input type="color" style={{ height: 40 }} />
                        </Form.Item>
                        <Form.Item label="Text Color" name={['colors', 'text']}>
                          <Input type="color" style={{ height: 40 }} />
                        </Form.Item>
                      </Col>
                      
                      {/* Live Color Preview */}
                      <Col span={12}>
                        <Text strong style={{ fontSize: 11 }}>PREVIEW MOCKUP</Text>
                        <div style={{
                          marginTop: 8,
                          width: '100%',
                          height: 200,
                          backgroundColor: form.getFieldValue(['colors', 'primary']) || '#f0f0f0',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #ddd'
                        }}>
                          <div style={{
                            width: '80%',
                            padding: 20,
                            backgroundColor: form.getFieldValue(['colors', 'secondary']) || '#fff',
                            borderRadius: 4,
                            textAlign: 'center'
                          }}>
                            <div style={{ 
                              color: form.getFieldValue(['colors', 'text']) || '#000', 
                              fontWeight: 'bold', 
                              fontSize: 16 
                            }}>
                              Template Preview Title
                            </div>
                            <div style={{ 
                              color: form.getFieldValue(['colors', 'text']) || '#333', 
                              fontSize: 12,
                              marginTop: 8
                            }}>
                              This is how your light/dark theme will appear in the studio.
                            </div>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Tabs.TabPane>
                </Tabs>
              </Card>
            </Form>
          ) : (
            <Card style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty 
                image={<FormatPainterOutlined style={{ fontSize: 48, color: '#d1d5db' }} />}
                description="Select a template from the left to edit or create a new one" 
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TemplateStudio;
