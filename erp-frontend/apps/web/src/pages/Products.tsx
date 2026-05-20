import { Card, Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { formatDateTime, formatMoney } from '@erp/shared';

const Products = () => {
  const columns = [
    { title: '产品编码', dataIndex: 'code', key: 'code' },
    { title: '产品名称', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'categoryName', key: 'categoryName' },
    { title: '规格', dataIndex: 'specification', key: 'specification' },
    { title: '单位', dataIndex: 'unit', key: 'unit' },
    {
      title: '售价',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => formatMoney(price),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'success' : 'default'}>
          {status === 1 ? '启用' : '停用'}
        </Tag>
      ),
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
        <Button type="link">编辑</Button>
      ),
    },
  ];

  const data = [
    {
      id: '1',
      code: 'P001',
      name: '示例产品A',
      categoryName: '电子产品',
      specification: '标准版',
      unit: '件',
      price: 199.99,
      status: 1,
      createdAt: '2024-01-15 10:30:00',
    },
  ];

  return (
    <Card
      title="产品管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          新增产品
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

export default Products;
