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
import { Layout, Menu, Space, Typography } from 'antd';
const { Text } = Typography;
import {
  DatabaseOutlined, CloudSyncOutlined,
  FormatPainterOutlined, EditOutlined, RobotOutlined, BookOutlined, SendOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons';

// ── Page imports ──────────────────────────────────────────────────────────────
import DataManagement  from './pages/DataManagement';
import ScraperConsole  from './pages/ScraperConsole';
import VisualGenerator from './pages/VisualGenerator';
import ContentStudio   from './pages/ContentStudio';
import PublisherAssistant from './pages/PublisherAssistant';
import TemplateStudio from './pages/TemplateStudio';
import Walkthrough     from './pages/Walkthrough';

const { Header, Content } = Layout;

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
    key: 'templates',
    icon: <AppstoreAddOutlined />,
    label: <Link to="/templates">Templates</Link>,
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
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          background: '#0f172a',
          height: 70,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          overflow: 'visible',
        }}
      >
        <Space style={{ marginRight: 48, flexShrink: 0, overflow: 'visible' }}>
          <div style={{
            background: '#38bdf8',
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
            flexShrink: 0
          }}>
            <RobotOutlined style={{ color: '#0f172a', fontSize: 22 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 4, overflow: 'visible' }}>
            <div style={{ 
              color: '#fff', 
              fontSize: 16, 
              fontWeight: 950, 
              letterSpacing: '0.02em', 
              lineHeight: 1.4,
              textTransform: 'uppercase'
            }}>BABA-APP</div>
            <div style={{ color: '#38bdf8', fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', marginTop: -4 }}>INTELLIGENCE</div>
          </div>
        </Space>

        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={navItems}
          theme="dark"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        />
        
        <Space style={{ marginLeft: 24 }}>
           <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
           <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 500 }}>PIPELINE ACTIVE</Text>
        </Space>
      </Header>

      {/* ── Page Content ───────────────────────────────────────────────────── */}
      <Content style={{ position: 'relative', paddingTop: 16 }}>
        {/* Fill screen, but leave space for header */}
        <div style={{ minHeight: 'calc(100vh - 70px - 16px)' }}>
          <Routes>
            <Route path="/"          element={<DataManagement />} />
            <Route path="/scraper"   element={<ScraperConsole />} />
            <Route path="/data"      element={<DataManagement />} />
            <Route path="/generator" element={<VisualGenerator />} />
            <Route path="/templates" element={<TemplateStudio />} />
            <Route path="/studio"    element={<ContentStudio />} />
            <Route path="/publisher" element={<PublisherAssistant />} />
            <Route path="/guide"     element={<Walkthrough />} />
          </Routes>
        </div>
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
