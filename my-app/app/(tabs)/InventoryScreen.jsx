import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  FlatList, 
  Text, 
  StyleSheet, 
  TextInput, 
  Animated, 
  ActivityIndicator, 
  RefreshControl, 
  TouchableOpacity 
} from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';
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
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState('hubs');
  const [selectedHubs, setSelectedHubs] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
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
          hubId: itemData.hubId,
          hubColor: hubColor,
          location: locationName,
          locationId: itemData.locationId,
          categories: itemData.categories || [],
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

  const fetchHubs = async () => {
    try {
      const hubsRef = collection(db, 'hubs');
      const q = query(hubsRef, where('owner', '==', auth.currentUser?.email));
      const querySnapshot = await getDocs(q);
      
      const userHubs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        color: doc.data().color
      }));
      
      setHubs(userHubs);
    } catch (error) {
      console.error('Error fetching hubs:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const locationsRef = collection(db, 'locations');
      const q = query(locationsRef, where('owner', '==', auth.currentUser?.email));
      const querySnapshot = await getDocs(q);
      
      const userLocations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        hubId: doc.data().hubId
      }));
      
      setLocations(userLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef, where('owner', '==', auth.currentUser?.email));
      const querySnapshot = await getDocs(q);
      
      const userCategories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      
      setCategories(userCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
    fetchHubs();
    fetchLocations();
    fetchCategories();
  }, []);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchInventoryItems();
    fetchHubs();
    fetchLocations();
    fetchCategories();
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const clearFilters = () => {
    setSelectedHubs([]);
    setSelectedLocations([]);
    setSelectedCategories([]);
    setActiveFilter('hubs');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleHubSelection = (hubId) => {
    setSelectedHubs(prev => 
      prev.includes(hubId) 
        ? prev.filter(id => id !== hubId) 
        : [...prev, hubId]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleLocationSelection = (locationId) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId) 
        : [...prev, locationId]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleCategorySelection = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    let filtered = [...inventoryItems];
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hub.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedHubs.length > 0) {
      filtered = filtered.filter(item => item.hubId && selectedHubs.includes(item.hubId));
    }
    
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(item => item.locationId && selectedLocations.includes(item.locationId));
    }
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => 
        item.categories && item.categories.some(catId => selectedCategories.includes(catId))
      );
    }
    
    setFilteredItems(filtered);
  }, [searchQuery, inventoryItems, selectedHubs, selectedLocations, selectedCategories]);

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

  const renderFilterItem = ({ item }) => {
    const isSelected = 
      (activeFilter === 'hubs' && selectedHubs.includes(item.id)) ||
      (activeFilter === 'locations' && selectedLocations.includes(item.id)) ||
      (activeFilter === 'categories' && selectedCategories.includes(item.id));

    return (
      <TouchableOpacity
        style={[
          styles.filterItem,
          isSelected && styles.selectedFilterItem,
          activeFilter === 'hubs' && { borderLeftColor: item.color || Colours.primary_colour }
        ]}
        onPress={() => {
          if (activeFilter === 'hubs') toggleHubSelection(item.id);
          if (activeFilter === 'locations') toggleLocationSelection(item.id);
          if (activeFilter === 'categories') toggleCategorySelection(item.id);
        }}
      >
        <Text 
          style={[
            styles.filterItemText,
            isSelected && styles.selectedFilterItemText
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const getFilterData = () => {
    switch (activeFilter) {
      case 'hubs':
        return hubs;
      case 'locations':
        return selectedHubs.length > 0 
          ? locations.filter(loc => selectedHubs.includes(loc.hubId))
          : locations;
      case 'categories':
        return categories;
      default:
        return [];
    }
  };

  // Search Bar Animation values
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [showFilters ? 150 : 60, 0],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={[
          styles.headerContainer,
          {
            height: headerHeight,
            opacity: headerOpacity,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBarWrapper}>
            <AntDesign name="search1" size={18} color="white" style={styles.searchIcon} />
            <TextInput
              style={styles.searchBar}
              placeholder="Search inventory..."
              placeholderTextColor="#ccc"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <AntDesign name="close" size={16} color="#ccc" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFilters(!showFilters);
              if (!showFilters) setActiveFilter('hubs');
            }}
            style={styles.filterToggleButton}
          >
            <Feather 
              name={showFilters ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  activeFilter === 'hubs' && styles.activeFilterButton
                ]}
                onPress={() => setActiveFilter(activeFilter === 'hubs' ? null : 'hubs')}
              >
                <Text style={styles.filterButtonText}>Hubs</Text>
                {selectedHubs.length > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{selectedHubs.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  activeFilter === 'locations' && styles.activeFilterButton,
                  selectedHubs.length === 0 && styles.disabledFilterButton
                ]}
                onPress={() => {
                  if (selectedHubs.length > 0) {
                    setActiveFilter(activeFilter === 'locations' ? null : 'locations');
                  }
                }}
                disabled={selectedHubs.length === 0}
              >
                <Text style={styles.filterButtonText}>Locations</Text>
                {selectedLocations.length > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{selectedLocations.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  activeFilter === 'categories' && styles.activeFilterButton
                ]}
                onPress={() => setActiveFilter(activeFilter === 'categories' ? null : 'categories')}
              >
                <Text style={styles.filterButtonText}>Categories</Text>
                {selectedCategories.length > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{selectedCategories.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {(selectedHubs.length > 0 || selectedLocations.length > 0 || selectedCategories.length > 0) && (
                <TouchableOpacity 
                  onPress={clearFilters}
                  style={styles.clearFiltersButton}
                >
                  <Feather name="x" size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>

            {activeFilter && (
              <FlatList
                data={getFilterData()}
                renderItem={renderFilterItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterItemsContainer}
              />
            )}
          </View>
        )}
      </Animated.View>

      <Animated.FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: 16,
          paddingHorizontal: 16,
          marginTop: showFilters ? 150 : 60,
        }}
        style={{ backgroundColor: Colours.bg_colour }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } }}],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
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
            progressViewOffset={showFilters ? 150 : 60}
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
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: Colours.header_colour,
    paddingHorizontal: 16,
    paddingTop: 10,
    overflow: 'hidden',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    height: 40,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 5,
  },
  filterToggleButton: {
    marginLeft: 10,
    padding: 8,
  },
  filtersContainer: {
    marginBottom: 5,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    height: 32,
  },
  activeFilterButton: {
    backgroundColor: '#333',
  },
  disabledFilterButton: {
    opacity: 0.5,
  },
  filterButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  filterBadge: {
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    paddingHorizontal: 4,
    marginLeft: 4,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterItemsContainer: {
    paddingHorizontal: 2,
    paddingBottom: 5,
  },
  filterItem: {
    backgroundColor: '#141414',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  selectedFilterItem: {
    backgroundColor: 'white',
  },
  filterItemText: {
    color: 'white',
    fontSize: 12,
  },
  selectedFilterItemText: {
    color: 'black',
    fontWeight: '500',
  },
  clearFiltersButton: {
    backgroundColor: '#333',
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
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