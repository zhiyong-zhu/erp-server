import { Card, Row, Col, Statistic } from 'antd';
import {
  ShoppingOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
} from '@ant-design/icons';

const Dashboard = () => {
  return (
    <div>
      <h1>欢迎使用 ERP 管理系统</h1>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="产品总数"
              value={1234}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="库存总量"
              value={5678}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日订单"
              value={89}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日销售额"
              value={12345.67}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="待处理事项" style={{ minHeight: 300 }}>
            <p>暂无待处理事项</p>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="系统公告" style={{ minHeight: 300 }}>
            <p>系统初始化完成</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
