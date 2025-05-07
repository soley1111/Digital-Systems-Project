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
import { useRouter } from 'expo-router';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import * as Haptics from 'expo-haptics';

export default function CategoriesModal() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});
  const [deletes, setDeletes] = useState<Set<string>>(new Set());
  const [isChanged, setIsChanged] = useState(false);
  const scrollViewRef = useRef(null);

  // Fetch categories from Firestore
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef, where('owner', '==', auth.currentUser?.email));
      const querySnapshot = await getDocs(q);
      
      const userCategories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      
      setCategories(userCategories);
      setEdits({});
      setDeletes(new Set());
      setIsChanged(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Add a new category to local state
  const addCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setCategories([...categories, { id: tempId, name: newCategoryName.trim() }]);
    setNewCategoryName('');
    setIsChanged(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Update category name in local state
  const updateCategory = (id, newName) => {
    if (!newName.trim()) return;
    
    setEdits({
      ...edits,
      [id]: newName.trim()
    });
    setIsChanged(true);
  };

  // Mark category for deletion
  const markForDeletion = (id) => {
    const newDeletes = new Set(deletes);
    if (newDeletes.has(id)) {
      newDeletes.delete(id);
    } else {
      newDeletes.add(id);
    }
    setDeletes(newDeletes);
    setIsChanged(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Save all changes to Firestore
  const saveChanges = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);

      // Process deletions
      deletes.forEach((id: string) => {
        if (!id.startsWith('temp-')) {
          batch.delete(doc(db, 'categories', id));
        }
      });

      // Process edits and new categories
      categories.forEach(cat => {
        if (deletes.has(cat.id)) return;

        if (cat.id.startsWith('temp-')) {
          // New category
          const newRef = doc(collection(db, 'categories'));
          batch.set(newRef, {
            name: cat.name,
            owner: auth.currentUser?.email
          });
        } else if (edits[cat.id] && edits[cat.id] !== cat.name) {
          // Edited category
          batch.update(doc(db, 'categories', cat.id), {
            name: edits[cat.id]
          });
        }
      });

      await batch.commit();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchCategories();
    } catch (error) {
      console.error('Error saving categories:', error);
      Alert.alert('Error', 'Failed to save changes');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // Render category item
  const renderCategory = ({ item }) => (
    <View style={[
      styles.categoryItem,
      deletes.has(item.id) && styles.deletedItem
    ]}>
      <TextInput
        style={[
          styles.categoryInput,
          deletes.has(item.id) && styles.strikethroughText
        ]}
        value={edits[item.id] !== undefined ? edits[item.id] : item.name}
        onChangeText={(text) => updateCategory(item.id, text)}
        editable={!deletes.has(item.id)}
      />
      <TouchableOpacity 
        onPress={() => markForDeletion(item.id)}
        style={styles.deleteButton}
      >
        <AntDesign 
          name={deletes.has(item.id) ? "closecircleo" : "closecircle"} 
          size={18} 
          color={deletes.has(item.id) ? Colours.tertiary_colour : '#ccc'} 
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
        <Text style={styles.title}>CATEGORIES</Text>
        <TouchableOpacity 
          onPress={saveChanges}
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

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Add new category */}
        <View style={styles.addContainer}>
          <Text style={styles.label}>Add New Category</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Category name"
              placeholderTextColor="#ccc"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              onSubmitEditing={addCategory}
              returnKeyType="done"
            />
            <TouchableOpacity 
              style={styles.addButton}
              onPress={addCategory}
              disabled={!newCategoryName.trim()}
            >
              <Feather name="plus" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories list */}
        <Text style={styles.label}>Your Categories</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colours.primary_colour} />
        ) : (
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No categories yet</Text>
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
  strikethroughText: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: '#ccc',
    color: '#aaa', 
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
});