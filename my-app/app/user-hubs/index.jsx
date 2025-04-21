import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import Colours from '../../constant/Colours';
import { useRouter } from 'expo-router';
import { collection,  query,  where,  getDocs, getDoc, doc, deleteDoc, arrayRemove, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

export default function UserHubsPage() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Fetch hubs from Firestore
  const fetchHubs = async () => {
    try {
      setLoading(true);
      const hubsRef = collection(db, 'hubs');
      const q = query(hubsRef, where('owner', '==', auth.currentUser.email));
      const querySnapshot = await getDocs(q);
  
      const userHubs = await Promise.all(querySnapshot.docs.map(async (hubDoc) => {
        const hubData = hubDoc.data();
        const locationIds = hubData.locations || [];
        
        // Fetch location names for each hub
        const locationNames = await Promise.all(
          locationIds.map(async (locId) => {
            const locDoc = await getDoc(doc(db, 'locations', locId));
            return locDoc.exists() ? locDoc.data().name : null;
          })
        ).then(names => names.filter(name => name !== null));
  
        return {
          id: hubDoc.id,
          ...hubData,
          locationNames
        };
      }));
  
      setHubs(userHubs);
    } catch (error) {
      console.error('Error fetching hubs:', error);
      Alert.alert('Error', 'Failed to load hubs');
    } finally {
      setLoading(false);
    }
  };

  // Relaod hub data when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchHubs();
    }, [])
  );

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await fetchHubs();
    setRefreshing(false);
  };

  // Hub item rendering
  const renderHub = ({ item }) => (
    <View style={styles.hubItem}>
      <View style={styles.hubContent}>
        <View style={[styles.colorCircle, { backgroundColor: item.color || 'gray' }]} />
        <View>
          <Text style={styles.hubName}>{item.name || 'Unnamed Hub'}</Text>
          <Text style={styles.hubLocations}>
            {Array.isArray(item.locationNames) ? `Locations: ${item.locationNames.length}` : 'Locations: 0'}
          </Text>
        </View>
      </View>
      <Link href={{
        pathname: "/editHubModal",
        params: { 
          hubId: item.id,
          hubName: item.name,
          hubColor: item.color,
          locations: JSON.stringify(item.locationNames || []),
          isEdit: "true"
        }
      }} push asChild >
        <TouchableOpacity style={styles.editIcon} onPress = { ()=> {Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}} >
          <AntDesign name="edit" size={20} color="white" />
        </TouchableOpacity>
      </Link>

      <TouchableOpacity onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        deleteHub(item.id);
      }} >
        <AntDesign name="delete" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  // Delete hub function - this deletes a hub and all its locations from Firestore
  const deleteHub = async (hubId) => {
    try {
      Alert.alert(
        'Delete Hub',
        'Are you sure you want to delete this hub and all its locations?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: async () => {
              const batch = writeBatch(db);
              
              // Delete all locations in this hub
              const locationsQuery = query(
                collection(db, 'locations'),
                where('hubId', '==', hubId)
              );
              const locationsSnapshot = await getDocs(locationsQuery);
              
              locationsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
              });
              
              // Delete the hub
              batch.delete(doc(db, 'hubs', hubId));
              
              // Remove from user's hubs array
              const userRef = doc(db, 'users', auth.currentUser.email);
              batch.update(userRef, {
                hubs: arrayRemove(hubId)
              });
              
              await batch.commit();
              setHubs(hubs.filter(hub => hub.id !== hubId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Hub deleted successfully');
            },
            style: 'destructive',
          },
        ]
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Error deleting hub:', error);
      Alert.alert('Error', 'Failed to delete hub');
    }
  };

  

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {router.back()}} >
          <AntDesign name="arrowleft" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>My Hubs</Text>
        <View style={{ flex: 1 }} />
        <Link href={{
          pathname: "/editHubModal",
          params: {
            isEdit: "false"
          }
        }} push asChild>
          <TouchableOpacity onPress = { ()=> {Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}} >
            <Feather name="plus" size={24} color="#f9f9f9" style={{ marginRight: 10 }} />
          </TouchableOpacity>
        </Link>
      </View>
      <FlatList
        data={hubs}
        renderItem={renderHub}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No hubs found. Create one!</Text>}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.bg_colour,
    padding: 20,
    paddingTop: 55,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colours.bg_colour,
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
  },
  listContainer: {
    marginTop: 10,
  },
  hubItem: {
    backgroundColor: Colours.header_colour,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hubContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  hubName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  hubLocations: {
    color: '#ccc',
    fontSize: 14,
  },
  editIcon: {
    marginRight: 15,
  },
  emptyText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});