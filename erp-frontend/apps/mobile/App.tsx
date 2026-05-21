import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TamaguiProvider } from 'tamagui';
import config from '@tamagui/config';

import LoginScreen from './src/screens/LoginScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import { useAuthStore } from './src/store/authStore';

const Stack = createStackNavigator();

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <TamaguiProvider config={config}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <Stack.Screen name="Main" component={MainTabNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </TamaguiProvider>
  );
}
