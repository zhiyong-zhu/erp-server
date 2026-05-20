import { Card, Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { formatDateTime, formatMoney } from '@erp/shared';

const Purchase = () => {
  const columns = [
    { title: '采购单号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '供应商', dataIndex: 'supplierName', key: 'supplierName' },
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
          received: { color: 'warning', text: '部分到货' },
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
      orderNo: 'PO20240115001',
      supplierName: '示例供应商A',
      totalAmount: 5999.99,
      paidAmount: 2999.99,
      status: 'received',
      createdAt: '2024-01-15 09:30:00',
    },
  ];

  return (
    <Card
      title="采购订单"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          新建采购单
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

export default Purchase;
