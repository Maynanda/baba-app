import React, { useEffect, useState } from 'react';
import { Table, Typography, message, Tabs } from 'antd';
import axios from 'axios';

const { Title } = Typography;

const DataManagement: React.FC = () => {
  const [rawContent, setRawContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRawData();
  }, []);

  const fetchRawData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/data/raw');
      setRawContent(response.data.data);
    } catch (error) {
      if (error instanceof Error) {
        message.error('Failed to fetch data: ' + error.message);
      } else {
        message.error('Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Source', dataIndex: 'source', key: 'source' },
    { title: 'Niche', dataIndex: 'niche', key: 'niche' },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Scraped At', dataIndex: 'scraped_at', key: 'scraped_at' },
  ];

  const items = [
    {
      key: '1',
      label: 'Raw Content',
      children: <Table dataSource={rawContent} columns={columns} rowKey="id" loading={loading} />
    },
    {
      key: '2',
      label: 'Content Pipeline',
      children: <p>Posts to be developed next.</p>
    }
  ]

  return (
    <div>
      <Title level={2}>Data Management</Title>
      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
};

export default DataManagement;
