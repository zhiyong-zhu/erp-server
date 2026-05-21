import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { YStack, XStack, Input, Button, Text, Card, H2, Separator } from 'tamagui';
import { mobileAuthApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const { setUser, setTokens, setPermissions } = useAuthStore();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const tokenData = await mobileAuthApi.login({ username, password });
      setTokens(tokenData.accessToken, tokenData.refreshToken);

      const userInfo = await mobileAuthApi.getUserInfo();
      setUser(userInfo);
      if (userInfo.permissions) {
        setPermissions(userInfo.permissions);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '登录失败';
      Alert.alert('登录失败', msg);
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
