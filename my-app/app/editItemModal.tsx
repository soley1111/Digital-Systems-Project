import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  FlatList
} from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';
import Colours from '../constant/Colours';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  doc, 
  collection, 
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import * as Haptics from 'expo-haptics';
import { Picker } from '@react-native-picker/picker';

interface Hub {
  id: string;
  name: string;
  color: string;
}

interface Location {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface EditHistoryItem {
  date: Date;
  previousQuantity: number;
  newQuantity: number;
  editedBy: string;
}

interface ItemData {
  id: string;
  name: string;
  sku: string;
  description: string;
  quantity: number;
  hubId: string;
  locationId: string;
  categories: string[];
  editHistory?: EditHistoryItem[];
  minStock: number;
}

export default function EditItemModal() {
  const params = useLocalSearchParams();
  const itemId = params.itemId as string;
  const router = useRouter();
  
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedHubId, setSelectedHubId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isChanged, setIsChanged] = useState(false);
  const [showHubPicker, setShowHubPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [minStock, setMinStock] = useState('1');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!itemId) {
          throw new Error('No item ID provided');
        }

        // Fetch item data
        const itemRef = doc(db, 'items', itemId);
        const itemSnap = await getDoc(itemRef);
        
        if (!itemSnap.exists()) {
          throw new Error('Item not found');
        }

        const item = itemSnap.data();
        const fetchedItemData = {
          id: itemSnap.id,
          name: item.name || '',
          sku: item.sku || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          hubId: item.hubId || '',
          locationId: item.locationId || '',
          categories: item.categories || [],
          minStock: item.minStock || 1, 
          editHistory: item.editHistory || []
        };

        setItemData(fetchedItemData);
        setMinStock(fetchedItemData.minStock.toString());
        setSelectedHubId(item.hubId || '');
        setSelectedLocationId(item.locationId || '');
        setSelectedCategories(item.categories || []);

        // Fetch hubs and categories in parallel
        const [hubsQuery, categoriesQuery] = await Promise.all([
          getDocs(query(collection(db, 'hubs'), where('owner', '==', auth.currentUser?.email))),
          getDocs(query(collection(db, 'categories'), where('owner', '==', auth.currentUser?.email)))
        ]);
        
        setHubs(hubsQuery.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          color: doc.data().color
        })));
        
        setCategories(categoriesQuery.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        })));

        // Fetch locations if we have a hubId
        if (item.hubId) {
          const locationsQuery = query(
            collection(db, 'locations'),
            where('hubId', '==', item.hubId)
          );
          const locationsSnapshot = await getDocs(locationsQuery);
          setLocations(locationsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name
          })));
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load item data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [itemId]);

  useEffect(() => {
    if (!selectedHubId) {
      setLocations([]);
      setSelectedLocationId('');
      return;
    }

    const fetchLocations = async () => {
      try {
        const locationsQuery = await getDocs(
          query(collection(db, 'locations'), 
          where('hubId', '==', selectedHubId)
        ));
        
        setLocations(locationsQuery.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        })));
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchLocations();
  }, [selectedHubId]);

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSelection = prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      setIsChanged(true);
      return newSelection;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const adjustQuantity = (amount: number) => {
    if (!itemData) return;
    
    const newQuantity = Math.max(1, itemData.quantity + amount);
    setItemData({...itemData, quantity: newQuantity});
    setIsChanged(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveItem = async () => {
    if (!itemData || !itemData.name.trim()) {
      Alert.alert('Error', 'Please provide an item name');
      return;
    }
  
    if (!selectedHubId) {
      Alert.alert('Error', 'Please select a hub');
      return;
    }
  
    if (!selectedLocationId) {
      Alert.alert('Error', 'Please select a location');
      return;
    }
  
    setLoading(true);
  
    try {
      const itemRef = doc(db, 'items', itemId);
      const currentItem = await getDoc(itemRef);
      
      if (!currentItem.exists()) {
        throw new Error('Item not found');
      }
  
      const currentData = currentItem.data();
      const currentQuantity = currentData.quantity || 0;
      const newQuantity = itemData.quantity;
  
      // Prepare the update data
      const updateData: any = {
        name: itemData.name.trim(),
        sku: itemData.sku.trim(),
        description: itemData.description.trim(),
        locationId: selectedLocationId,
        hubId: selectedHubId,
        categories: selectedCategories,
        updatedAt: serverTimestamp(),
        minStock: parseInt(minStock) || 1,
      };
  
      // Only update quantity and add to edit history if it changed
      if (newQuantity !== currentQuantity) {
        updateData.quantity = newQuantity;
        
        const editEntry = {
          date: new Date(),
          previousQuantity: currentQuantity,
          newQuantity: newQuantity,
          editedBy: auth.currentUser?.email || 'unknown'
        };
        
        updateData.editHistory = arrayUnion(editEntry);
      }
  
      await updateDoc(itemRef, updateData);
  
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Item updated successfully!');
      router.back();
    } catch (error) {
      console.error("Error updating item:", error);
      Alert.alert('Error', 'Failed to update item. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedHubName = () => {
    const hub = hubs.find(h => h.id === selectedHubId);
    return hub ? hub.name : 'HUB';
  };

  const getSelectedLocationName = () => {
    if (!selectedHubId) return 'SELECT HUB';
    const location = locations.find(l => l.id === selectedLocationId);
    return location ? location.name : 'LOCATION';
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        selectedCategories.includes(item.id) && styles.selectedCategoryPill
      ]}
      onPress={() => toggleCategorySelection(item.id)}
    >
      <Text style={[
        styles.categoryPillText,
        selectedCategories.includes(item.id) && styles.selectedCategoryPillText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colours.bg_colour }}>
        <ActivityIndicator size="large" color={Colours.primary_colour} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colours.bg_colour }}>
        <Text style={{ color: 'white', marginBottom: 20 }}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colours.tertiary_colour }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!itemData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colours.bg_colour }}>
        <Text style={{ color: 'white' }}>Item data not available</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <AntDesign name="down" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>EDIT ITEM</Text>
        <TouchableOpacity 
          onPress={saveItem}
          disabled={!isChanged || loading}
          style={styles.saveButton}
        >
          <Text style={[
            styles.saveButtonText,
            !isChanged && { opacity: 0.5 }
          ]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Quantity Control */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => adjustQuantity(-1)}
          >
            <AntDesign name="minuscircle" size={28} color={Colours.tertiary_colour} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.quantityInput}
            value={itemData.quantity.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 0;
              setItemData({...itemData, quantity: Math.max(0, num)});
              setIsChanged(true);
            }}
            keyboardType="numeric"
            selectTextOnFocus
            maxLength={4}
          />
          
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => adjustQuantity(1)}
          >
            <AntDesign name="pluscircle" size={28} color={Colours.tertiary_colour} />
          </TouchableOpacity>
        </View>

        {/* Item Details */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Item name"
            placeholderTextColor="#ccc"
            value={itemData.name}
            onChangeText={(text) => {
              setItemData({...itemData, name: text});
              setIsChanged(true);
            }}
          />

          <Text style={styles.label}>SKU</Text>
          <TextInput
            style={styles.input}
            placeholder="SKU (optional)"
            placeholderTextColor="#ccc"
            value={itemData.sku}
            onChangeText={(text) => {
              setItemData({...itemData, sku: text});
              setIsChanged(true);
            }}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Item description"
            placeholderTextColor="#ccc"
            value={itemData.description}
            onChangeText={(text) => {
              setItemData({...itemData, description: text});
              setIsChanged(true);
            }}
            multiline
          />
          <Text style={styles.label}>Low Stock Threshold</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor="#ccc"
            value={minStock}
            onChangeText={(text) => {
              setMinStock(text);
              setIsChanged(true);
            }}
            keyboardType="numeric"
          />

          {/* Categories */}
          <Text style={styles.label}>Categories</Text>
          {categories.length > 0 ? (
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            />
          ) : (
            <Text style={styles.noCategoriesText}>No categories available</Text>
          )}

          {/* Hub and Location */}
          <Text style={styles.label}>Hub and Location</Text>
          <View style={styles.row}>
            <TouchableOpacity 
              style={[
                styles.pickerButton, 
                styles.halfWidth,
                selectedHubId && { 
                  borderColor: hubs.find(h => h.id === selectedHubId)?.color || Colours.header_colour, 
                  borderWidth: 2 
                }
              ]}
              onPress={() => {
                setShowLocationPicker(false);
                setShowHubPicker(!showHubPicker);
              }}
            >
              <Text style={styles.pickerButtonText}>{getSelectedHubName()}</Text>
              <AntDesign name={showHubPicker ? "up" : "down"} size={16} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.pickerButton,
                styles.halfWidth,
                !selectedHubId && styles.disabledPickerButton
              ]}
              onPress={() => {
                if (selectedHubId) {
                  setShowHubPicker(false);
                  setShowLocationPicker(!showLocationPicker);
                }
              }}
              disabled={!selectedHubId}
            >
              <Text style={styles.pickerButtonText}>{getSelectedLocationName()}</Text>
              <AntDesign name={showLocationPicker ? "up" : "down"} size={16} color="white" />
            </TouchableOpacity>
          </View>

          {showHubPicker && (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedHubId}
                onValueChange={(itemValue) => {
                  setSelectedHubId(itemValue);
                  setSelectedLocationId('');
                  setShowHubPicker(false);
                  setIsChanged(true);
                }}
                style={styles.picker}
                dropdownIconColor="white"
              >
                <Picker.Item label="-SELECT A HUB-" value="" />
                {hubs.map(hub => (
                  <Picker.Item 
                    key={hub.id} 
                    label={hub.name} 
                    value={hub.id} 
                  />
                ))}
              </Picker>
            </View>
          )}

          {showLocationPicker && selectedHubId && (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedLocationId}
                onValueChange={(itemValue) => {
                  setSelectedLocationId(itemValue);
                  setShowLocationPicker(false);
                  setIsChanged(true);
                }}
                style={styles.picker}
                dropdownIconColor="white"
              >
                <Picker.Item label="-SELECT A LOCATION-" value="" />
                {locations.map(location => (
                  <Picker.Item 
                    key={location.id} 
                    label={location.name} 
                    value={location.id} 
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.bg_colour,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colours.primary_colour,
    textAlign: 'center',
    paddingLeft: 10,
  },
  saveButton: {
    paddingHorizontal: 10,
    marginLeft: 'auto',
  },
  saveButtonText: {
    color: Colours.tertiary_colour,
    fontWeight: 'bold',
    fontSize: 16,
  },
  quantityContainer: {
    backgroundColor: Colours.header_colour,
    borderRadius: 50,
    padding: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 200,
    minWidth: 200,
    alignSelf: 'center',
  },
  quantityInput: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 5,
    minWidth: 60,
    maxWidth: 100,
  },
  quantityButton: {
    padding: 10,
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  formContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 12,
    color: 'white',
    fontSize: 16,
    marginBottom: 15,
  },
  pickerButton: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0,
  },
  disabledPickerButton: {
    opacity: 0.6,
  },
  pickerButtonText: {
    color: 'white',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    color: 'white',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  halfWidth: {
    flex: 0.48,
  },
  categoriesList: {
    paddingBottom: 10,
  },
  categoryPill: {
    backgroundColor: Colours.header_colour,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 15,
  },
  selectedCategoryPill: {
    backgroundColor: Colours.tertiary_colour,
  },
  categoryPillText: {
    color: 'white',
    fontSize: 14,
  },
  selectedCategoryPillText: {
    color: '#ccc',
    fontWeight: 'bold',
  },
  noCategoriesText: {
    color: '#aaa',
    marginBottom: 15,
    fontStyle: 'italic',
  },
});