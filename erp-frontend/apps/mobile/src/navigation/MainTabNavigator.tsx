import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import InventoryScreen from '../screens/InventoryScreen';
import ScanScreen from '../screens/ScanScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const icons: Record<string, string> = {
  Home: '🏠',
  Inventory: '📦',
  Scan: '📷',
  Orders: '📋',
  Profile: '👤',
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Text style={{ fontSize: size, color }}>{icons[route.name] || '📱'}</Text>
        ),
        tabBarActiveTintColor: '#1890ff',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{ title: '库存' }} />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: '扫码',
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: '订单' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}
