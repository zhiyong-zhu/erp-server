import { useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Card, Text, Tabs, Button } from 'tamagui';

interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed';
  type: 'sale' | 'purchase';
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNo: 'SO20240115001',
    customerName: '示例客户A',
    totalAmount: 1999.99,
    status: 'pending',
    type: 'sale',
  },
  {
    id: '2',
    orderNo: 'PO20240115002',
    customerName: '示例供应商B',
    totalAmount: 5999.99,
    status: 'processing',
    type: 'purchase',
  },
];

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: '#faad14' },
  processing: { label: '处理中', color: '#1890ff' },
  shipped: { label: '已发货', color: '#52c41a' },
  completed: { label: '已完成', color: '#52c41a' },
};

const typeMap: Record<string, string> = {
  sale: '销售',
  purchase: '采购',
};

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState('all');

  const filteredOrders =
    activeTab === 'all'
      ? mockOrders
      : mockOrders.filter((order) => order.type === activeTab);

  return (
    <YStack f={1} bg="$gray3">
      <Tabs
        defaultValue="all"
        orientation="horizontal"
        flexDirection="column"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <Tabs.List disablePassBorderRadius>
          <Tabs.Tab flex={1} value="all">
            <Text>全部</Text>
          </Tabs.Tab>
          <Tabs.Tab flex={1} value="sale">
            <Text>销售</Text>
          </Tabs.Tab>
          <Tabs.Tab flex={1} value="purchase">
            <Text>采购</Text>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <ScrollView style={{ flex: 1 }}>
        <YStack space="$2" p="$3">
          {filteredOrders.map((order) => (
            <Card key={order.id} elevate bordered p="$3">
              <YStack space="$1">
                <XStack jc="space-between" ai="center">
                  <Text fontSize="$4" fontWeight="bold">
                    {order.orderNo}
                  </Text>
                  <Text
                    fontSize="$2"
                    color={statusMap[order.status].color}
                    fontWeight="bold"
                  >
                    {statusMap[order.status].label}
                  </Text>
                </XStack>
                <Text fontSize="$2" color="$gray10">
                  {typeMap[order.type]} | {order.customerName}
                </Text>
                <XStack jc="space-between" ai="center" mt="$1">
                  <Text fontSize="$4" fontWeight="bold" color="#1890ff">
                    ¥{order.totalAmount.toFixed(2)}
                  </Text>
                  <Button size="$2" theme="alt1">
                    详情
                  </Button>
                </XStack>
              </YStack>
            </Card>
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
