import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  FlatList
} from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';
import Colours from '../constant/Colours';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  setDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp, 
  writeBatch,
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import * as Haptics from 'expo-haptics';

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
  const router = useRouter();
  
  const [hubName, setHubName] = useState(isEdit ? params.hubName as string : '');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<string[]>(isEdit ? JSON.parse(params.locations as string) : []);
  const [selectedColor, setSelectedColor] = useState(isEdit ? params.hubColor as string : colorOptions[0]);
  const [existingLocationDocs, setExistingLocationDocs] = useState<LocationDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletes, setDeletes] = useState<Set<number>>(new Set()); // Changed to track indices
  const [isChanged, setIsChanged] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const saveHub = async () => {
    if (hubName.trim() === '') {
      Alert.alert('Error', 'Please provide a hub name');
      return;
    }
  
    const remainingLocations = locations.filter((_, index) => !deletes.has(index));
    if (remainingLocations.length === 0) {
      Alert.alert('Error', 'Please add at least one location');
      return;
    }
  
    setLoading(true);
  
    try {
      if (isEdit) {
        const batch = writeBatch(db);
  
        const hubRef = doc(db, 'hubs', hubId);
        batch.update(hubRef, {
          name: hubName,
          color: selectedColor,
          updatedAt: serverTimestamp()
        });
  
        // New logic for handling location updates
        const updatedLocationIds: string[] = [];
  
        for (let i = 0; i < existingLocationDocs.length; i++) {
          const existingDoc = existingLocationDocs[i];
  
          if (deletes.has(i)) {
            // Delete this location
            batch.delete(doc(db, 'locations', existingDoc.id));
          } else {
            // Update name if it changed
            const newName = locations[i];
            if (newName !== existingDoc.name) {
              batch.update(doc(db, 'locations', existingDoc.id), {
                name: newName,
                updatedAt: serverTimestamp(),
              });
            }
            updatedLocationIds.push(existingDoc.id);
          }
        }
  
        // Add any newly added locations beyond the length of existing ones
        const newLocationIds: string[] = [];
        for (let i = existingLocationDocs.length; i < locations.length; i++) {
          if (deletes.has(i)) continue;
          const locName = locations[i];
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
  
        batch.update(hubRef, {
          locations: [...updatedLocationIds, ...newLocationIds],
        });
  
        await batch.commit();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const locationsToSave = locations.filter((_, index) => !deletes.has(index));
  
        const batch = writeBatch(db);
  
        const hubRef = doc(collection(db, 'hubs'));
        batch.set(hubRef, {
          name: hubName,
          color: selectedColor,
          owner: auth.currentUser?.email,
          locations: [],
          createdAt: serverTimestamp()
        });
  
        const locationIds = [];
        for (const locName of locationsToSave) {
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
  
        batch.update(hubRef, {
          locations: locationIds
        });
  
        const userRef = doc(db, 'users', auth.currentUser?.email as string);
        batch.update(userRef, {
          hubs: arrayUnion(hubRef.id)
        });
  
        await batch.commit();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
  
      router.back();
    } catch (error) {
      console.error("Error saving hub:", error);
      Alert.alert('Error', 'Failed to save hub. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };
  

  const addLocation = () => {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }
    
    if (locations.includes(trimmedLocation)) {
      Alert.alert('Error', 'This location already exists');
      return;
    }
    
    setLocations([...locations, trimmedLocation]);
    setLocation('');
    setIsChanged(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateLocation = (index: number, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedLocations = [...locations];
    updatedLocations[index] = newName.trim();
    setLocations(updatedLocations);
    setIsChanged(true);
  };

  const markForDeletion = (index: number) => {
    const newDeletes = new Set(deletes);
    if (newDeletes.has(index)) {
      newDeletes.delete(index);
    } else {
      newDeletes.add(index);
    }
    setDeletes(newDeletes);
    setIsChanged(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderLocation = ({ item, index }: { item: string, index: number }) => (
    <View style={[
      styles.categoryItem,
      deletes.has(index) && styles.deletedItem
    ]}>
      <TextInput
        style={[
          styles.categoryInput,
          deletes.has(index) && styles.strikethroughText
        ]}
        value={item}
        onChangeText={(text) => updateLocation(index, text)}
        editable={!deletes.has(index)}
      />
      <TouchableOpacity 
        onPress={() => markForDeletion(index)}
        style={styles.deleteButton}
      >
        <AntDesign 
          name={deletes.has(index) ? "closecircleo" : "closecircle"} 
          size={18} 
          color={deletes.has(index) ? Colours.tertiary_colour : '#ccc'} 
        />
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.title}>{isEdit ? 'EDIT HUB' : 'CREATE HUB'}</Text>
        <TouchableOpacity 
          onPress={saveHub}
          disabled={(!isChanged && deletes.size === 0) || loading}
          style={styles.saveButton}
        >
          <Text style={[
            styles.saveButtonText,
            (!isChanged && deletes.size === 0) && { opacity: 0.5 }
          ]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hub name and color */}
        <View style={styles.addContainer}>
          <Text style={styles.label}>Hub Name</Text>
          <TextInput
            style={[styles.input, { borderColor: selectedColor, borderWidth: 2 }]}
            placeholder="House, Office, etc."
            placeholderTextColor="#ccc"
            value={hubName}
            onChangeText={(text) => {
              setHubName(text);
              setIsChanged(true);
            }}
          />
        </View>

        <View style={styles.addContainer}>
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
                onPress={() => {
                  setSelectedColor(color);
                  setIsChanged(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Add new location */}
        <View style={styles.addContainer}>
          <Text style={styles.label}>Add New Location</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Location name"
              placeholderTextColor="#ccc"
              value={location}
              onChangeText={setLocation}
              onSubmitEditing={addLocation}
              returnKeyType="done"
            />
            <TouchableOpacity 
              style={styles.addButton}
              onPress={addLocation}
              disabled={!location.trim()}
            >
              <Feather name="plus" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Locations list */}
        <Text style={styles.label}>Your Locations</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colours.primary_colour} />
        ) : (
          <FlatList
            data={locations}
            renderItem={renderLocation}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No locations yet</Text>
            }
          />
        )}
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
  addContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    marginLeft: 5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 12,
    color: 'white',
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: Colours.tertiary_colour,
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryItem: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedItem: {
    opacity: 0.6,
  },
  categoryInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 2,
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: '#ccc',
  },
  deleteButton: {
    marginLeft: 10,
    padding: 5,
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  colorPicker: {
    marginBottom: 0,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 3,
  },
});