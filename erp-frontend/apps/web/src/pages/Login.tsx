import { useState } from 'react';
import { Form, Input, Button, Card, message, Row, Col } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient, useAuthStore } from '@erp/shared';

interface LoginForm {
  username: string;
  password: string;
}

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();

  const handleLogin = async (values: LoginForm) => {
    setLoading(true);
    try {
      // Mock login for development
      if (values.username === 'admin' && values.password === '123456') {
        const mockUser = {
          id: '1',
          username: 'admin',
          nickname: '管理员',
          status: 1,
          createdAt: new Date().toISOString(),
        };
        setUser(mockUser);
        setTokens('mock_access_token', 'mock_refresh_token');
        message.success('登录成功');
        navigate('/');
        return;
      }

      // Real API call
      const response = await apiClient.post<{
        user: any;
        accessToken: string;
        refreshToken: string;
      }>('/system/auth/login', values);

      setUser(response.user);
      setTokens(response.accessToken, response.refreshToken);
      message.success('登录成功');
      navigate('/');
    } catch (error: any) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Col xs={22} sm={16} md={12} lg={8} xl={6}>
        <Card
          title={<h2 style={{ textAlign: 'center', margin: 0 }}>ERP 管理系统</h2>}
          style={{
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            borderRadius: 8,
          }}
        >
          <Form
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名 (admin)"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码 (123456)"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default Login;
