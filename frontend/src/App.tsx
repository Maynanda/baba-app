import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  DatabaseOutlined,
  DashboardOutlined,
  FormatPainterOutlined,
  EditOutlined,
} from '@ant-design/icons';
import DataManagement from './pages/DataManagement';

const { Header, Content, Footer, Sider } = Layout;

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    { key: '1', icon: <DashboardOutlined />, label: <Link to="/">Scraper Console</Link> },
    { key: '2', icon: <DatabaseOutlined />, label: <Link to="/data">Data Management</Link> },
    { key: '3', icon: <FormatPainterOutlined />, label: <Link to="/generator">Visual Generator</Link> },
    { key: '4', icon: <EditOutlined />, label: <Link to="/studio">Content Studio</Link> },
  ];

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
          <div className="demo-logo-vertical" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
          <Menu theme="dark" defaultSelectedKeys={['2']} mode="inline" items={menuItems} />
        </Sider>
        <Layout>
          <Header style={{ padding: 0, background: colorBgContainer }} />
          <Content style={{ margin: '0 16px' }}>
            <div
              style={{
                padding: 24,
                minHeight: 360,
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
                marginTop: 16,
              }}
            >
              <Routes>
                <Route path="/" element={<h2>Scraper Console (Coming Soon)</h2>} />
                <Route path="/data" element={<DataManagement />} />
                <Route path="/generator" element={<h2>Visual Generator (Coming Soon)</h2>} />
                <Route path="/studio" element={<h2>Content Studio (Coming Soon)</h2>} />
              </Routes>
            </div>
          </Content>
          <Footer style={{ textAlign: 'center' }}>
            Baba-App Content Studio ©{new Date().getFullYear()} created for AI Engineering
          </Footer>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;
