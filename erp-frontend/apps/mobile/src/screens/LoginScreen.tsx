import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { YStack, XStack, Input, Button, Text, Card, H2, Separator } from 'tamagui';
import { useAuthStore, apiClient } from '@erp/shared';

export default function LoginScreen() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const { setUser, setTokens } = useAuthStore();

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Mock login for development
      if (username === 'admin' && password === '123456') {
        const mockUser = {
          id: '1',
          username: 'admin',
          nickname: '管理员',
          status: 1,
          createdAt: new Date().toISOString(),
        };
        setUser(mockUser);
        setTokens('mock_access_token', 'mock_refresh_token');
        return;
      }

      const response = await apiClient.post<{
        user: any;
        accessToken: string;
        refreshToken: string;
      }>('/system/auth/login', { username, password });

      setUser(response.user);
      setTokens(response.accessToken, response.refreshToken);
    } catch (error: any) {
      alert(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <YStack f={1} jc="center" ai="center" space="$4" p="$4">
        <Card elevate size="$4" bordered width="90%" maxWidth={350}>
          <Card.Header padded>
            <H2 textAlign="center">ERP 移动版</H2>
          </Card.Header>
          <Separator />
          <YStack space="$3" p="$4">
            <YStack space="$1">
              <Text fontSize="$3" color="$gray10">
                用户名
              </Text>
              <Input
                value={username}
                onChangeText={setUsername}
                placeholder="请输入用户名"
                keyboardType="default"
                autoCapitalize="none"
              />
            </YStack>

            <YStack space="$1">
              <Text fontSize="$3" color="$gray10">
                密码
              </Text>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="请输入密码"
                secureTextEntry
              />
            </YStack>

            <Button
              theme="active"
              onPress={handleLogin}
              disabled={loading}
              mt="$2"
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </YStack>
        </Card>
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
