import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import Colours from '../constant/Colours';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { setDoc, doc, updateDoc, arrayUnion, serverTimestamp, writeBatch,
collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';


// This is a list of colors for the color picker - store these in constants
const colorOptions = [
  '#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00',
  '#FFFF00', '#CCFF00', '#99FF00', '#66FF00', '#33FF00',
  '#00FF00', '#00FF33', '#00FF66', '#00FF99', '#00FFCC',
  '#00FFFF', '#00CCFF', '#0099FF', '#0066FF', '#0033FF',
  '#0000FF', '#3300FF', '#6600FF', '#9900FF', '#CC00FF'
];

interface LocationDoc {
  id: string;
  name: string;
}

export default function EditHubModal() {
  const params = useLocalSearchParams();
  const isEdit = params.isEdit === 'true';
  const hubId = params.hubId as string;
  
  const [hubName, setHubName] = useState(isEdit ? params.hubName as string : '');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<string[]>(isEdit ? JSON.parse(params.locations as string) : []);
  const [selectedColor, setSelectedColor] = useState(isEdit ? params.hubColor as string : colorOptions[0]);
  const [existingLocationDocs, setExistingLocationDocs] = useState<LocationDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);
  const [editingLocationText, setEditingLocationText] = useState('');
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);


  // This effect runs when the component mounts and when isEdit or hubId changes
  // It fetches the existing locations for the hub if in edit mode
  useEffect(() => {
    if (!isEdit) return;

    const fetchLocations = async () => {
      try {
        const locationsRef = collection(db, 'locations');
        const q = query(locationsRef, where('hubId', '==', hubId));
        const querySnapshot = await getDocs(q);
        
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        
        setExistingLocationDocs(docs);
      } catch (error) {
        console.error('Error fetching locations:', error);
        Alert.alert('Error', 'Failed to load hub data');
      }
    };

    fetchLocations();
  }, [isEdit, hubId]);

  const scrollToInput = (reactNode: any) => {
    reactNode?.measure((x, y, width, height, pageX, pageY) => {
      scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
    });
  };

  const saveHub = async () => {
    if (hubName.trim() === '') {
      Alert.alert('Error', 'Please provide a hub name');
      return;
    }

    if (locations.length === 0) {
      Alert.alert('Error', 'Please add at least one location');
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        // Update existing hub
        const batch = writeBatch(db);
        
        // 1. Update hub document
        const hubRef = doc(db, 'hubs', hubId);
        batch.update(hubRef, {
          name: hubName,
          color: selectedColor,
          updatedAt: serverTimestamp()
        });

        // 2. Get current locations to compare
        const currentLocationsQuery = query(
          collection(db, 'locations'),
          where('hubId', '==', hubId)
        );
        const currentLocationsSnapshot = await getDocs(currentLocationsQuery);
        const currentLocations = currentLocationsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));

        // 3. Handle locations:
        // a. Find locations that were removed
        const removedLocations = currentLocations.filter(
          loc => !locations.includes(loc.name)
        );
        
        // b. Delete removed locations
        removedLocations.forEach(loc => {
          batch.delete(doc(db, 'locations', loc.id));
        });

        // c. Find new locations that need to be added
        const existingLocationNames = currentLocations.map(loc => loc.name);
        const newLocations = locations.filter(
          loc => !existingLocationNames.includes(loc)
        );

        // d. Create new location documents
        const newLocationIds = [];
        for (const locName of newLocations) {
          const locRef = doc(collection(db, 'locations'));
          batch.set(locRef, {
            name: locName,
            hubId: hubId,
            owner: auth.currentUser?.email,
            items: [],
            createdAt: serverTimestamp()
          });
          newLocationIds.push(locRef.id);
        }

        // e. Update hub's locations array
        const remainingLocationIds = currentLocations
          .filter(loc => locations.includes(loc.name))
          .map(loc => loc.id);
        
        batch.update(hubRef, {
          locations: [...remainingLocationIds, ...newLocationIds]
        });

        await batch.commit();
        Alert.alert('Success', 'Hub updated successfully!');
      } else {
        // Create new hub
        const batch = writeBatch(db);
        
        // 1. Create hub document
        const hubRef = doc(collection(db, 'hubs'));
        batch.set(hubRef, {
          name: hubName,
          color: selectedColor,
          owner: auth.currentUser?.email,
          locations: [],
          createdAt: serverTimestamp()
        });

        // 2. Create location documents
        const locationIds = [];
        for (const locName of locations) {
          const locRef = doc(collection(db, 'locations'));
          batch.set(locRef, {
            name: locName,
            hubId: hubRef.id,
            owner: auth.currentUser?.email,
            items: [],
            createdAt: serverTimestamp()
          });
          locationIds.push(locRef.id);
        }

        // 3. Update hub with location IDs
        batch.update(hubRef, {
          locations: locationIds
        });

        // 4. Update user's hubs array
        const userRef = doc(db, 'users', auth.currentUser?.email as string);
        batch.update(userRef, {
          hubs: arrayUnion(hubRef.id)
        });

        await batch.commit();
        Alert.alert('Success', 'Hub created successfully!');
      }
      
      router.back();
    } catch (error) {
      console.error("Error saving hub:", error);
      Alert.alert('Error', 'Failed to save hub. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addLocation = () => {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) return;
    
    if (locations.includes(trimmedLocation)) {
      Alert.alert('Error', 'This location already exists');
      return;
    }
    
    setLocations([...locations, trimmedLocation]);
    setLocation('');
  };

  const removeLocation = (index: number) => {
    const updatedLocations = [...locations];
    updatedLocations.splice(index, 1);
    setLocations(updatedLocations);
    if (editingLocationIndex === index) {
      cancelEditingLocation();
    }
  };

  const startEditingLocation = (index: number) => {
    setEditingLocationIndex(index);
    setEditingLocationText(locations[index]);
  };

  const saveEditedLocation = () => {
    if (editingLocationIndex === null) return;
    
    const trimmedText = editingLocationText.trim();
    if (!trimmedText) {
      Alert.alert('Error', 'Location name cannot be empty');
      return;
    }
    
    if (locations.includes(trimmedText) && locations[editingLocationIndex] !== trimmedText) {
      Alert.alert('Error', 'This location already exists');
      return;
    }
    
    const updatedLocations = [...locations];
    updatedLocations[editingLocationIndex] = trimmedText;
    setLocations(updatedLocations);
    cancelEditingLocation();
  };

  const cancelEditingLocation = () => {
    setEditingLocationIndex(null);
    setEditingLocationText('');
  };

  const renderLocation = ({ item, index }: { item: string, index: number }) => (
    <View style={styles.locationItem}>
      {editingLocationIndex === index ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editingLocationText}
            onChangeText={setEditingLocationText}
            autoFocus
            onSubmitEditing={saveEditedLocation}
            returnKeyType="done"
            onFocus={(e) => {
              scrollToInput(e.target);
            }}
          />
          <View style={styles.editButtons}>
            <TouchableOpacity onPress={saveEditedLocation}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelEditingLocation}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => startEditingLocation(index)}
          >
            <Text style={styles.locationText}>{item}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeLocation(index)}>
            <AntDesign name="delete" size={20} color="white" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <AntDesign name="down" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'EDIT HUB' : 'CREATE HUB'}</Text>
          <TouchableOpacity 
          onPress={saveHub} 
          disabled={loading} 
          style={styles.confirmHeaderButton}
        >
          <Text style={styles.confirmHeaderText}>SAVE</Text>
        </TouchableOpacity>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Hub Name</Text>
          <TextInput
            style={[styles.hubNameInput, { borderColor: selectedColor, borderWidth: 2 }]}
            placeholder="House, Office, etc."
            placeholderTextColor="#ccc"
            value={hubName}
            onChangeText={setHubName}
          />

          <Text style={styles.label}>Color</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.colorPicker}
            contentContainerStyle={{ paddingVertical: 5 }}
          >
            {colorOptions.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorCircle,
                  { 
                    backgroundColor: color, 
                    borderColor: selectedColor === color ? 'white' : 'transparent',
                  },
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>Locations</Text>
          <View style={styles.locationInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter location"
              placeholderTextColor="#ccc"
              value={location}
              onChangeText={setLocation}
              onSubmitEditing={addLocation}
              returnKeyType="done"
            />
            <TouchableOpacity 
              style={styles.addLocationButton} 
              onPress={addLocation}
              disabled={!location.trim()}
            >
              <AntDesign name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={locations}
          renderItem={renderLocation}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No locations added yet</Text>
          }
          scrollEnabled={false}
        />
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
    textAlign: 'center',
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
  hubNameInput: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: 'white',
    fontSize: 16,
  },
  colorPicker: {
    marginBottom: 15,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 3,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 15,
    color: 'white',
    fontSize: 16,
    flex: 1,
  },
  addLocationButton: {
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  locationItem: {
    backgroundColor: Colours.header_colour,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  locationText: {
    color: 'white',
    fontSize: 16,
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  editInput: {
    flex: 1,
    backgroundColor: Colours.header_colour,
    color: 'white',
    padding: 0,
    borderRadius: 5,
    marginRight: 0,
    fontSize: 16,
    minHeight: 40,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  saveText: {
    color: Colours.tertiary_colour,
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelText: {
    color: '#ccc',
    fontWeight: 'bold',
    fontSize: 14,
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
});