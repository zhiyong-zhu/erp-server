import { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Space } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  LogoutOutlined,
  UserOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@erp/shared';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '首页' },
    { key: '/products', icon: <AppstoreOutlined />, label: '产品管理' },
    { key: '/inventory', icon: <InboxOutlined />, label: '库存管理' },
    { key: '/sales', icon: <ShoppingOutlined />, label: '销售管理' },
    { key: '/purchase', icon: <ShoppingCartOutlined />, label: '采购管理' },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const selectedKey = location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h2 style={{ margin: 0, color: '#1890ff' }}>{collapsed ? 'ERP' : 'ERP 系统'}</h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          >
            {collapsed ? '展开' : '收起'}
          </Button>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.nickname || user?.username || '用户'}</span>
              <DownOutlined />
            </Space>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
