import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, List, Typography, Space, Spin, Tag } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, CodeOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

const { Text } = Typography;

interface ChatPart {
  text?: string;
  function_call?: {
    name: string;
    args: any;
  };
  function_response?: {
    name: string;
    response: any;
  };
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatPart[];
}

const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: inputValue.trim() }],
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputValue('');
    setLoading(true);

    try {
      const response = await apiClient.post('/chat', {
        messages: newHistory,
      });

      if (response.data.status === 'success') {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Fallback message if it fails
      setMessages([...newHistory, { role: 'model', parts: [{ text: 'Sorry, I encountered an error. Please try again.' }] }]);
    } finally {
      setLoading(false);
    }
  };

  const renderPart = (part: ChatPart, idx: number) => {
    if (part.text) {
      return <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>{part.text}</div>;
    }
    if (part.function_call) {
      return (
        <div key={idx} style={{ margin: '8px 0' }}>
          <Tag icon={<CodeOutlined />} color="cyan">
            Tool Call: {part.function_call.name}
          </Tag>
          <pre style={{ fontSize: 10, background: '#f1f5f9', padding: 8, borderRadius: 4, marginTop: 4 }}>
            {JSON.stringify(part.function_call.args, null, 2)}
          </pre>
        </div>
      );
    }
    if (part.function_response) {
      return (
        <div key={idx} style={{ margin: '8px 0' }}>
          <Tag icon={<CodeOutlined />} color="green">
            Tool Returned
          </Tag>
          {/* Optionally hide raw response to prevent clutter, but useful for debugging */}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 24px', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          <RobotOutlined style={{ marginRight: 8, color: '#38bdf8' }} />
          AI Chat Agent
        </Typography.Title>
        <Text type="secondary">
          Integrated RAG & Tools Agent. I can search the database, check templates, and help you draft content dynamically.
        </Text>
      </div>

      <Card 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '0 24px' }}
        bodyStyle={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 100, color: '#94a3b8' }}>
              <RobotOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
              <h3>How can I help you today?</h3>
              <p>Try asking: "Search the database for AI Engineering concepts" or "List all custom templates."</p>
            </div>
          )}
          
          <List
            itemLayout="horizontal"
            dataSource={messages.filter(m => m.parts.some(p => p.text || p.function_call))} // hide raw tool responses if needed
            renderItem={(msg) => {
              const isUser = msg.role === 'user' && !msg.parts.some(p => p.function_response);
              if (msg.role === 'user' && msg.parts.some(p => p.function_response)) return null; // hide invisible tool returns

              return (
                <div style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  marginBottom: 24,
                }}>
                  {!isUser && (
                    <div style={{ marginRight: 12, marginTop: 4 }}>
                      <RobotOutlined style={{ fontSize: 24, color: '#38bdf8' }} />
                    </div>
                  )}
                  
                  <div style={{
                    maxWidth: '80%',
                    background: isUser ? '#2563eb' : '#f8fafc',
                    color: isUser ? '#fff' : '#0f172a',
                    padding: '12px 16px',
                    borderRadius: 12,
                    borderTopRightRadius: isUser ? 2 : 12,
                    borderTopLeftRadius: !isUser ? 2 : 12,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: isUser ? 'none' : '1px solid #e2e8f0'
                  }}>
                    {msg.parts.map((p, idx) => renderPart(p, idx))}
                  </div>

                  {isUser && (
                    <div style={{ marginLeft: 12, marginTop: 4 }}>
                      <UserOutlined style={{ fontSize: 24, color: '#94a3b8' }} />
                    </div>
                  )}
                </div>
              );
            }}
          />
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
               <div style={{ marginRight: 12, marginTop: 4 }}>
                  <RobotOutlined style={{ fontSize: 24, color: '#38bdf8' }} />
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 12, borderTopLeftRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Spin size="small" /> <Text style={{ marginLeft: 8 }} type="secondary">Thinking & running tools...</Text>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 16, background: '#fff', borderTop: '1px solid #f1f5f9' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              size="large"
              placeholder="Ask the AI to search database, list templates, or draft ideas..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={handleSend}
              disabled={loading}
              style={{ borderRadius: '8px 0 0 8px' }}
            />
            <Button
              size="large"
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
              style={{ borderRadius: '0 8px 8px 0', padding: '0 24px' }}
            >
              Send
            </Button>
          </Space.Compact>
        </div>
      </Card>
    </div>
  );
};

export default AgentChat;
