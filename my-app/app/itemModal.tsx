import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AntDesign } from '@expo/vector-icons';
import Colours from '../constant/Colours';
import { useRouter } from 'expo-router';
import { 
  doc, 
  collection, 
  setDoc, 
  serverTimestamp,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';

interface Hub {
  id: string;
  name: string;
  color: string;
}

interface Location {
  id: string;
  name: string;
}

export default function ItemModal() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedHubId, setSelectedHubId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [showHubPicker, setShowHubPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
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
        Alert.alert('Error', 'Failed to load hubs');
      }
    };

    fetchHubs();
  }, []);

  useEffect(() => {
    if (!selectedHubId) {
      setLocations([]);
      setSelectedLocationId('');
      return;
    }

    const fetchLocations = async () => {
      try {
        const locationsRef = collection(db, 'locations');
        const q = query(locationsRef, where('hubId', '==', selectedHubId));
        const querySnapshot = await getDocs(q);
        
        const hubLocations = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        
        setLocations(hubLocations);
      } catch (error) {
        console.error('Error fetching locations:', error);
        Alert.alert('Error', 'Failed to load locations');
      }
    };

    fetchLocations();
  }, [selectedHubId]);

  const saveItem = async () => {
    if (!name.trim()) {
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

    const quantityNum = parseInt(quantity) || 1;

    setLoading(true);

    try {
      const itemRef = doc(collection(db, 'items'));
      
      await setDoc(itemRef, {
        name: name.trim(),
        description: description.trim(),
        quantity: quantityNum,
        qrCode: qrCode.trim(),
        locationId: selectedLocationId,
        hubId: selectedHubId,
        owner: auth.currentUser?.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Add item to location's items array
      const locationRef = doc(db, 'locations', selectedLocationId);
      await updateDoc(locationRef, {
        items: arrayUnion(itemRef.id)
      });

      Alert.alert('Success', 'Item created successfully!');
      router.back();
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedHubName = () => {
    const hub = hubs.find(h => h.id === selectedHubId);
    return hub ? hub.name : 'HUB';
  };

  const getSelectedLocationName = () => {
    if (!selectedHubId) return 'Select a hub first';
    const location = locations.find(l => l.id === selectedLocationId);
    return location ? location.name : 'LOCATION';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <AntDesign name="down" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>CREATE ITEM</Text>
          <TouchableOpacity 
            onPress={saveItem} 
            disabled={loading} 
            style={styles.confirmHeaderButton}
          >
            <Text style={styles.confirmHeaderText}>SAVE</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Item name"
            placeholderTextColor="#ccc"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Item description"
            placeholderTextColor="#ccc"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#ccc"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />

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
    paddingTop: 25,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colours.primary_colour,
    marginLeft: 10,
    
    flex: 1,
  },
  formContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: 'white',
    fontSize: 16,
  },
  pickerButton: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0, // Remove default border
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
    marginTop: 5, // Adjust spacing between button and dropdown
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    color: 'white',
  },
  confirmHeaderButton: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  confirmHeaderText: {
    color: Colours.tertiary_colour,
    fontWeight: 'bold',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  halfWidth: {
    flex: 0.48,
  },
});