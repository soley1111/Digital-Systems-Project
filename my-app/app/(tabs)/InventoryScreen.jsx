import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, Text, StyleSheet, TextInput, Animated } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Colours from '../../constant/Colours';

export default function InventoryScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Test data for inventory items
  const inventoryItems = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
    { id: '4', name: 'Item 4' },
    { id: '5', name: 'Item 5' },
    { id: '6', name: 'Item 6' },
    { id: '7', name: 'Item 7' },
    { id: '8', name: 'Item 8' },
    { id: '9', name: 'Item 9' },
    { id: '10', name: 'Item 10' },
    { id: '11', name: 'Item 11' },
    { id: '12', name: 'Item 12' },
    { id: '13', name: 'Item 13' },
    { id: '14', name: 'Item 14' },
    { id: '15', name: 'Item 15' },
    { id: '16', name: 'Item 16' },
    { id: '17', name: 'Item 17' },
  ];

  // Filter items based on the search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems(inventoryItems);
    } else {
      setFilteredItems(
        inventoryItems.filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery]);

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>{item.name}</Text>
    </View>
  );

  const searchBarHeight = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [60, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={[
          styles.searchBarContainer,
          { height: searchBarHeight, overflow: 'hidden' },
        ]}
      >
        <View style={styles.searchBarWrapper}>
          <AntDesign name="search1" size={20} color="white" style={styles.searchIcon} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search inventory..."
            placeholderTextColor="#ccc"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </Animated.View>
      <Animated.FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Colours.bg_colour }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBarContainer: {
    backgroundColor: Colours.header_colour,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    height: 35,
    fontSize: 16,
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  itemContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    borderRadius: 8,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
});