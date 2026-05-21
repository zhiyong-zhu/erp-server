import { Alert, ScrollView } from 'react-native';
import { YStack, Card, Text, Button, Avatar, Separator, ListItem } from 'tamagui';
import { useAuthStore } from '../store/authStore';
import { mobileAuthApi } from '../api/auth';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const menuItems = [
    { icon: '📋', label: '我的订单', onPress: () => {} },
    { icon: '🔔', label: '消息通知', onPress: () => {} },
    { icon: '⚙️', label: '系统设置', onPress: () => {} },
    { icon: '❓', label: '帮助中心', onPress: () => {} },
  ];

  const handleLogout = async () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            if (user) {
              await mobileAuthApi.logout();
            }
          } catch {
            // ignore logout API errors
          }
          logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <YStack space="$3" p="$3">
        <Card elevate bordered p="$4">
          <YStack ai="center" space="$2">
            <Avatar circular size="$6" bg="$blue10">
              <Text fontSize="$6" color="white">
                {(user?.realName || user?.username || '?')[0].toUpperCase()}
              </Text>
            </Avatar>
            <Text fontSize="$5" fontWeight="bold">
              {user?.realName || user?.username || '用户'}
            </Text>
            <Text fontSize="$3" color="$gray10">
              {user?.email || '未设置邮箱'}
            </Text>
          </YStack>
        </Card>

        <Card elevate bordered>
          <YStack>
            {menuItems.map((item, index) => (
              <YStack key={item.label}>
                <ListItem
                  hoverTheme
                  pressTheme
                  icon={<Text fontSize="$4">{item.icon}</Text>}
                  title={item.label}
                  onPress={item.onPress}
                />
                {index < menuItems.length - 1 && <Separator />}
              </YStack>
            ))}
          </YStack>
        </Card>

        <Button theme="red" onPress={handleLogout}>
          退出登录
        </Button>

        <Text fontSize="$2" color="$gray10" textAlign="center" mt="$4">
          ERP Mobile v1.0.0
        </Text>
      </YStack>
    </ScrollView>
  );
}
