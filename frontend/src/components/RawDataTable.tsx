/**
 * components/RawDataTable.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dumb presentational table for raw scraped content.
 * Receives data as props — NO API calls inside this component.
 *
 * Rule for agents: Components are pure UI. They only receive props + render.
 * Data fetching belongs in Pages or hooks.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { Table, Tag, Modal, Typography, Button, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RawContent } from '../types';

const { Paragraph, Text } = Typography;

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

  const columns: ColumnsType<RawContent> = [
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 110,
      render: (source: string) => (
        <Tag color={SOURCE_COLORS[source] ?? 'default'}>{source}</Tag>
      ),
      filters: [...new Set(data.map(d => d.source))].map(s => ({ text: s, value: s })),
      onFilter: (value, record) => record.source === value,
    },
    {
      title: 'Niche',
      dataIndex: 'niche',
      key: 'niche',
      width: 130,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Scraped At',
      dataIndex: 'scraped_at',
      key: 'scraped_at',
      width: 170,
      render: (val: string) => val ? new Date(val).toLocaleString() : '—',
      sorter: (a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <>
          <Button type="link" size="small" onClick={() => setInspectItem(record)}>
            Inspect
          </Button>
          {onDelete && (
            <Popconfirm
              title="Delete this item?"
              onConfirm={() => onDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <Table<RawContent>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} items` }}
        size="small"
        scroll={{ x: 800 }}
      />

      <Modal
        title={inspectItem?.title ?? 'Raw Content Inspector'}
        open={!!inspectItem}
        onCancel={() => setInspectItem(null)}
        footer={null}
        width={720}
      >
        {inspectItem && (
          <>
            <Text type="secondary">ID: {inspectItem.id}</Text>
            <Paragraph style={{ marginTop: 12 }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, maxHeight: 480, overflow: 'auto' }}>
                {JSON.stringify(JSON.parse(inspectItem.data_json), null, 2)}
              </pre>
            </Paragraph>
          </>
        )}
      </Modal>
    </>
  );
};

export default RawDataTable;
