/**
 * App.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Root application — horizontal top-nav header layout.
 * No sidebar. Navigation lives in the top Header bar.
 *
 * Rule for agents: To add a new page:
 *  1. Create the page file in src/pages/
 *  2. Add the import here
 *  3. Add a <Route> entry in the Routes block
 *  4. Add a matching item to navItems below
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  BrowserRouter as Router, Routes, Route, Link, useLocation,
} from 'react-router-dom';
import { Layout, Menu, Typography, Space } from 'antd';
import {
  DatabaseOutlined, CloudSyncOutlined,
  FormatPainterOutlined, EditOutlined, RobotOutlined, BookOutlined, SendOutlined,
} from '@ant-design/icons';

// ── Page imports ──────────────────────────────────────────────────────────────
import DataManagement  from './pages/DataManagement';
import ScraperConsole  from './pages/ScraperConsole';
import VisualGenerator from './pages/VisualGenerator';
import ContentStudio   from './pages/ContentStudio';
import PublisherAssistant from './pages/PublisherAssistant';
import Walkthrough     from './pages/Walkthrough';

const { Header, Content } = Layout;
const { Text } = Typography;

// ── Nav items definition ──────────────────────────────────────────────────────
// key must match the Route path (without leading /)
const navItems = [
  {
    key: 'scraper',
    icon: <CloudSyncOutlined />,
    label: <Link to="/scraper">Scraper</Link>,
  },
  {
    key: 'data',
    icon: <DatabaseOutlined />,
    label: <Link to="/data">Data</Link>,
  },
  {
    key: 'studio',
    icon: <EditOutlined />,
    label: <Link to="/studio">Studio</Link>,
  },
  {
    key: 'generator',
    icon: <FormatPainterOutlined />,
    label: <Link to="/generator">Generator</Link>,
  },
  {
    key: 'publisher',
    icon: <SendOutlined />,
    label: <Link to="/publisher">Publisher</Link>,
  },
  {
    key: 'guide',
    icon: <BookOutlined />,
    label: <Link to="/guide">Guide</Link>,
  },
];

// ── Inner layout ──────────────────────────────────────────────────────────────
const AppLayout: React.FC = () => {
  const location = useLocation();
  const selectedKey = location.pathname.split('/')[1] || 'data';

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          height: 52,
        }}
      >
        {/* Brand */}
        <Space style={{ marginRight: 32, flexShrink: 0 }}>
          <RobotOutlined style={{ color: '#38bdf8', fontSize: 18 }} />
          <Text strong style={{ color: '#fff', fontSize: 15, letterSpacing: 0.5 }}>
            Baba-App
          </Text>
          <Text style={{ color: '#475569', fontSize: 11 }}>
            Content Automation
          </Text>
        </Space>

        {/* Navigation */}
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={navItems}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            lineHeight: '50px',
          }}
          theme="dark"
        />
      </Header>

      {/* ── Page Content ───────────────────────────────────────────────────── */}
      <Content style={{ padding: '20px 24px' }}>
        {/* Agent rule: Add new <Route> here when adding a page */}
        <Routes>
          <Route path="/"          element={<DataManagement />} />
          <Route path="/scraper"   element={<ScraperConsole />} />
          <Route path="/data"      element={<DataManagement />} />
          <Route path="/generator" element={<VisualGenerator />} />
          <Route path="/studio"    element={<ContentStudio />} />
          <Route path="/publisher" element={<PublisherAssistant />} />
          <Route path="/guide"     element={<Walkthrough />} />
        </Routes>
      </Content>
    </Layout>
  );
};

// ── Root export ───────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <Router>
    <AppLayout />
  </Router>
);

export default App;
