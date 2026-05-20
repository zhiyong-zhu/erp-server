import { ScrollView } from 'react-native';
import { YStack, XStack, Card, Text, H3, Button } from 'tamagui';
import { useAuthStore } from '@erp/shared';

export default function HomeScreen() {
  const { user } = useAuthStore();

  const stats = [
    { label: '今日订单', value: '89', color: '#1890ff' },
    { label: '待出库', value: '23', color: '#52c41a' },
    { label: '库存预警', value: '5', color: '#ff4d4f' },
    { label: '本月销售', value: '¥12.5万', color: '#faad14' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <YStack space="$3" p="$3">
        <Card elevate bordered p="$4">
          <Text fontSize="$5" fontWeight="bold">
            欢迎回来，{user?.nickname || user?.username || '用户'}
          </Text>
          <Text fontSize="$3" color="$gray10" mt="$1">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </Text>
        </Card>

        <XStack flexWrap="wrap" gap="$3" jc="space-between">
          {stats.map((stat) => (
            <Card key={stat.label} elevate bordered f={1} minWidth={100} p="$3">
              <Text fontSize="$6" fontWeight="bold" color={stat.color}>
                {stat.value}
              </Text>
              <Text fontSize="$2" color="$gray10" mt="$1">
                {stat.label}
              </Text>
            </Card>
          ))}
        </XStack>

        <Card elevate bordered p="$4">
          <H3 mb="$3">快捷操作</H3>
          <YStack space="$2">
            <Button theme="active">扫码入库</Button>
            <Button theme="alt1">扫码出库</Button>
            <Button theme="alt2">新建订单</Button>
            <Button>查看报表</Button>
          </YStack>
        </Card>

        <Card elevate bordered p="$4">
          <H3 mb="$3">待处理事项</H3>
          <Text color="$gray10">暂无待处理事项</Text>
        </Card>
      </YStack>
    </ScrollView>
  );
}
