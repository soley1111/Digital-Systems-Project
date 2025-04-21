import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useContext } from 'react';
import Colours from '../../constant/Colours';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { UserDetailContext } from '../../context/userDetailContext';

// LANDING SCREEN
// NEEDS WORK

export default function LoginScreen() {
  const router = useRouter();
  const { setUserDetail } = useContext(UserDetailContext);
  const [loading, setLoading] = useState(true); // Loading state


  // Check if user is logged in and fetch user details
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const result = await getDoc(doc(db, 'users', user?.email));
        setUserDetail(result.data());
        router.replace('/(tabs)');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);


  // Show loading indicator while checking auth state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colours.tertiary_colour} />
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/icon1.png')}
          style={{ width: 200, height: 200, alignSelf: 'center' }}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.headerText}>QR Inventory Manager</Text>
        <Text style={styles.descriptionText}>
          with demand forecasting and analytics
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Text style={styles.descriptionText1}>
          Please continue to sign in or create an account.
        </Text>
        <TouchableOpacity
          style={styles.button1}
          onPress={() => router.replace('(login)/SignIn')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: Colours.bg_colour,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colours.bg_colour,
  },
  textContainer: {
    position: 'absolute',
    bottom: '30%',
    width: '100%',
  },
  headerText: {
    color: Colours.primary_colour,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  descriptionText: {
    color: Colours.primary_colour,
    fontSize: 16,
    textAlign: 'center',
  },
  descriptionText1: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  button1: {
    backgroundColor: Colours.tertiary_colour,
    padding: 10,
    borderRadius: 15,
    width: 330,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  buttonText: {
    color: Colours.primary_colour,
    fontSize: Colours.medium_size,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 50,
    width: '100%',
  },
  imageContainer: {
    position: 'absolute',
    bottom: '38%',
    width: '100%',
  },
});