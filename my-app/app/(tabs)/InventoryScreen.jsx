import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, Text, StyleSheet, TextInput, Animated, ActivityIndicator, RefreshControl } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Colours from '../../constant/Colours';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import * as Haptics from 'expo-haptics';

export default function InventoryScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchInventoryItems = async () => {
    try {
      const itemsRef = collection(db, 'items');
      const q = query(itemsRef, where('owner', '==', auth.currentUser?.email));
      const querySnapshot = await getDocs(q);

      const items = await Promise.all(querySnapshot.docs.map(async (itemDoc) => {
        const itemData = itemDoc.data();
        
        let hubName = 'UNASSIGNED';
        let hubColor = Colours.primary_colour;
        if (itemData.hubId) {
          const hubDoc = await getDoc(doc(db, 'hubs', itemData.hubId));
          if (hubDoc.exists()) {
            hubName = hubDoc.data().name;
            hubColor = hubDoc.data().color || Colours.primary_colour;
          }
        }

        let locationName = 'UNASSIGNED';
        if (itemData.locationId) {
          const locationDoc = await getDoc(doc(db, 'locations', itemData.locationId));
          if (locationDoc.exists()) {
            locationName = locationDoc.data().name;
          }
        }

        return {
          id: itemDoc.id,
          name: itemData.name || 'Unnamed Item',
          quantity: itemData.quantity || 1,
          hub: hubName,
          hubColor: hubColor,
          location: locationName,
          ...itemData
        };
      }));

      setInventoryItems(items);
      setFilteredItems(items);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      Alert.alert('Error', 'Failed to load inventory items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchInventoryItems();
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems(inventoryItems);
    } else {
      setFilteredItems(
        inventoryItems.filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.hub.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.location.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, inventoryItems]);

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={[styles.colorStrip, { backgroundColor: item.hubColor }]} />
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.itemDetails}>
          <Text style={styles.itemDetail}>Qty: {item.quantity}</Text>
          <Text style={styles.itemDetail}>{item.hub}</Text>
          <Text style={styles.itemDetail}>{item.location}</Text>
        </View>
      </View>
    </View>
  );

  const searchBarHeight = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [60, 0],
    extrapolate: 'clamp',
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colours.primary_colour} />
      </View>
    );
  }

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
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {inventoryItems.length === 0 ? 'No inventory items found' : 'No matching items found'}
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colours.primary_colour]}
            tintColor={Colours.primary_colour}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colours.bg_colour,
  },
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
    flexDirection: 'row',
    backgroundColor: Colours.header_colour,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  colorStrip: {
    width: 6,
  },
  itemContent: {
    flex: 1,
    padding: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemDetail: {
    fontSize: 14,
    color: '#ccc',
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});