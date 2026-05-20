import { useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Card, Text, Input, Button, Separator } from 'tamagui';

interface InventoryItem {
  id: string;
  productCode: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  warningThreshold: number;
}

const mockData: InventoryItem[] = [
  {
    id: '1',
    productCode: 'P001',
    productName: '示例产品A',
    warehouseName: '主仓库',
    quantity: 100,
    warningThreshold: 20,
  },
  {
    id: '2',
    productCode: 'P002',
    productName: '示例产品B',
    warehouseName: '主仓库',
    quantity: 5,
    warningThreshold: 10,
  },
];

export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = mockData.filter(
    (item) =>
      item.productName.includes(searchQuery) || item.productCode.includes(searchQuery)
  );

  return (
    <YStack f={1} bg="$gray3">
      <XStack p="$3" space="$2" bg="$background">
        <Input
          f={1}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索产品编码或名称"
        />
        <Button theme="active">搜索</Button>
      </XStack>

      <ScrollView style={{ flex: 1 }}>
        <YStack space="$2" p="$3">
          {filteredData.map((item) => (
            <Card key={item.id} elevate bordered p="$3">
              <YStack space="$1">
                <XStack jc="space-between" ai="center">
                  <Text fontSize="$4" fontWeight="bold">
                    {item.productName}
                  </Text>
                  <Text
                    fontSize="$3"
                    color={item.quantity < item.warningThreshold ? '#ff4d4f' : '#52c41a'}
                    fontWeight="bold"
                  >
                    {item.quantity}
                  </Text>
                </XStack>
                <Text fontSize="$2" color="$gray10">
                  编码: {item.productCode} | 仓库: {item.warehouseName}
                </Text>
                {item.quantity < item.warningThreshold && (
                  <Text fontSize="$2" color="#ff4d4f">
                    ⚠️ 库存不足 (预警值: {item.warningThreshold})
                  </Text>
                )}
              </YStack>
              <Separator my="$2" />
              <XStack space="$2" jc="flex-end">
                <Button size="$2" theme="alt1">
                  入库
                </Button>
                <Button size="$2" theme="alt2">
                  出库
                </Button>
              </XStack>
            </Card>
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
