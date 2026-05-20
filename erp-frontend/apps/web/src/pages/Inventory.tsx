import { Card, Table, Button, Tag, Badge } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const Inventory = () => {
  const columns = [
    { title: '产品编码', dataIndex: 'productCode', key: 'productCode' },
    { title: '产品名称', dataIndex: 'productName', key: 'productName' },
    { title: '仓库', dataIndex: 'warehouseName', key: 'warehouseName' },
    {
      title: '库存数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => (
        <Badge
          count={quantity}
          style={{
            backgroundColor: quantity < 10 ? '#ff4d4f' : '#52c41a',
          }}
          showZero
        />
      ),
    },
    { title: '可用数量', dataIndex: 'availableQuantity', key: 'availableQuantity' },
    { title: '锁定数量', dataIndex: 'lockedQuantity', key: 'lockedQuantity' },
    {
      title: '状态',
      key: 'status',
      render: (record: any) => {
        const isLow = record.quantity < (record.warningThreshold || 10);
        return (
          <Tag color={isLow ? 'error' : 'success'}>
            {isLow ? '库存不足' : '正常'}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Button type="link">明细</Button>
      ),
    },
  ];

  const data = [
    {
      id: '1',
      productCode: 'P001',
      productName: '示例产品A',
      warehouseName: '主仓库',
      quantity: 100,
      availableQuantity: 90,
      lockedQuantity: 10,
      warningThreshold: 20,
    },
  ];

  return (
    <Card
      title="库存管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          入库操作
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

export default Inventory;
