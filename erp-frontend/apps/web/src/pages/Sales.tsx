import { Card, Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { formatDateTime, formatMoney } from '@erp/shared';

const Sales = () => {
  const columns = [
    { title: '订单编号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '客户', dataIndex: 'customerName', key: 'customerName' },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => formatMoney(amount),
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (amount: number) => formatMoney(amount),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          draft: { color: 'default', text: '草稿' },
          confirmed: { color: 'processing', text: '已确认' },
          shipped: { color: 'warning', text: '已发货' },
          completed: { color: 'success', text: '已完成' },
          cancelled: { color: 'error', text: '已取消' },
        };
        const { color, text } = statusMap[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Button type="link">详情</Button>
      ),
    },
  ];

  const data = [
    {
      id: '1',
      orderNo: 'SO20240115001',
      customerName: '示例客户A',
      totalAmount: 1999.99,
      paidAmount: 1999.99,
      status: 'completed',
      createdAt: '2024-01-15 14:30:00',
    },
  ];

  return (
    <Card
      title="销售订单"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          新建订单
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={{
          total: 1,
          pageSize: 20,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </Card>
  );
};

export default Sales;
