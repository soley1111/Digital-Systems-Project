import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Tabs } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import Colours from '../../constant/Colours';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colours.tertiary_colour,
        tabBarInactiveTintColor: '#e5e6e8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: Colours.header_colour,
          borderTopWidth: 0,
          paddingTop: 5,
        },
        headerTitleStyle: { fontWeight: 'bold' },
        headerTintColor: '#f9f9f9',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: Colours.header_colour,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: 'HOME',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="InventoryScreen"
        options={{
          tabBarLabel: 'Inventory',
          headerTitle: 'INVENTORY',
          headerRight: () => (
            <Link href="/itemModal" push asChild>
              <TouchableOpacity onPress = { ()=> {Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}} >
              <Feather name="plus" size={24} color="#f9f9f9" style={{ marginRight: 15 }} />
            </TouchableOpacity>
            </Link>
          ),
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="database" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ScanScreen"
        options={{
          headerTitle: 'SCAN QR',
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="scan1" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="AlertsScreen"
        options={{
          headerTitle: 'ALERTS',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="bells" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ProfileScreen"
        options={{
          headerTitle: 'PROFILE',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}