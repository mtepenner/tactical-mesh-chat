import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import ChatRoom from './screens/ChatRoom';
import TacticalMap from './screens/TacticalMap';
import MeshHealth from './screens/MeshHealth';

type TabParamList = {
  Chat: undefined;
  Map: undefined;
  Health: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }): React.JSX.Element {
  const icons: Record<string, string> = {
    Chat: '💬',
    Map: '🗺️',
    Health: '📡',
  };
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.6 }}>
      {icons[name] ?? '●'}
    </Text>
  );
}

export default function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
          tabBarStyle: {
            backgroundColor: '#1a1a2e',
            borderTopColor: '#333',
          },
          tabBarActiveTintColor: '#4fc3f7',
          tabBarInactiveTintColor: '#888',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        })}
      >
        <Tab.Screen name="Chat" component={ChatRoom} />
        <Tab.Screen name="Map" component={TacticalMap} />
        <Tab.Screen name="Health" component={MeshHealth} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
