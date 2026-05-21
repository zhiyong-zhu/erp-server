import { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi, useAuthStore } from '@erp/shared';

interface LoginForm {
  username: string;
  password: string;
}

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setTokens, setPermissions } = useAuthStore();

  const handleLogin = async (values: LoginForm) => {
    setLoading(true);
    try {
      const tokenData = await authApi.login(values);
      setTokens(tokenData.accessToken, tokenData.refreshToken);

      const userInfo = await authApi.getUserInfo();
      setUser(userInfo);
      if (userInfo.permissions) {
        setPermissions(userInfo.permissions);
      }

      message.success('登录成功');
      navigate('/');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '登录失败';
      message.error(msg);
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
            initialValues={{ username: 'admin', password: '123456' }}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
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
