import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import React, { useState, useContext, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { signOut, deleteUser, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import Colours from '../../constant/Colours';
import Feather from '@expo/vector-icons/Feather';
import { UserDetailContext } from '../../context/userDetailContext';
import ProfileImage from '../../components/ProfileImage';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import RBSheet from 'react-native-raw-bottom-sheet';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function ProfileScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { userDetail } = useContext(UserDetailContext);
  const refRBSheet = useRef();

  // Function to handle sign out
  const handleSignOut = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              console.log('User signed out!');
              router.replace('(login)');
            } catch (error) {
              console.error('Error signing out: ', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Function to delete all user data from Firestore
  const deleteUserData = async (userId) => {
    try {
      const batch = writeBatch(db);
      
      // Delete all user's hubs and their locations
      const hubsQuery = query(collection(db, 'hubs'), where('owner', '==', userId));
      const hubsSnapshot = await getDocs(hubsQuery);
      
      // First collect all hub IDs to delete their locations
      const hubIds = [];
      hubsSnapshot.forEach((hubDoc) => {
        hubIds.push(hubDoc.id);
        batch.delete(hubDoc.ref);
      });
      
      // Delete all locations in these hubs
      const locationsQuery = query(collection(db, 'locations'), where('owner', '==', userId));
      const locationsSnapshot = await getDocs(locationsQuery);
      locationsSnapshot.forEach((locDoc) => {
        batch.delete(locDoc.ref);
      });
      
      // Delete all items
      const itemsQuery = query(collection(db, 'items'), where('owner', '==', userId));
      const itemsSnapshot = await getDocs(itemsQuery);
      itemsSnapshot.forEach((itemDoc) => {
        batch.delete(itemDoc.ref);
      });
      
      // Delete all categories
      const categoriesQuery = query(collection(db, 'categories'), where('owner', '==', userId));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      categoriesSnapshot.forEach((catDoc) => {
        batch.delete(catDoc.ref);
      });
      
      // Delete all alerts
      const alertsQuery = query(collection(db, 'alerts'), where('owner', '==', userId));
      const alertsSnapshot = await getDocs(alertsQuery);
      alertsSnapshot.forEach((alertDoc) => {
        batch.delete(alertDoc.ref);
      });
      
      // Delete user document
      const userRef = doc(db, 'users', userId);
      batch.delete(userRef);
      
      await batch.commit();
      console.log('All user data deleted successfully');
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  };

  // Function to handle account deletion
  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
  
    if (!user) {
      setErrorMessage('No user is currently signed in');
      return;
    }
  
    try {
      // Re-authenticate the user
      await signInWithEmailAndPassword(auth, user.email, password);
  
      // Delete all user data first
      await deleteUserData(user.email);
      
      // Then delete the user account
      await deleteUser(user);
      
      Alert.alert('Account Deleted', 'Your account and all data have been successfully deleted');
      router.replace('(login)');
    } catch (e) {
      let error = '';
      switch (e.code) {
        case 'auth/missing-password':
          error = 'Please enter your password';
          break;
        case 'auth/invalid-credential':
          error = 'Incorrect password. Please try again';
          break;
        case 'auth/too-many-requests':
          error = 'Too many attempts. Please try again later';
          break;
        default:
          error = 'An error occurred. Please try again';
          console.error('Account deletion error:', e);
      }
      setErrorMessage(error);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.userProfileContainer}>
        <ProfileImage name={userDetail?.fullname || 'User'} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userDetail?.fullname.toUpperCase() || 'User'}</Text>
          <Text style={styles.userEmail}>{userDetail?.email || 'user@email.com'}</Text>
        </View>
      </View>
      <View style={styles.logOutButtonContainer}>
        <TouchableOpacity style={styles.logOutButton} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleSignOut();
        }}>
          <Feather name="log-out" size={18} color="white" style={styles.logOutIcon} />
          <Text style={styles.logOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.settingsLabelContainer}>
        <Text style={styles.settingsLabel}>User Settings</Text>
      </View>
      <View style={styles.settingsContainer}>
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/user-hubs')}>
          <Feather name="home" size={20} color="white" style={styles.settingIcon} />
          <Text style={styles.settingText}>My Hubs</Text>
        </TouchableOpacity>
        <Link href="/categoryModal" push asChild>
            <TouchableOpacity style={styles.settingItem}>
              <Feather name="folder" size={20} color="white" style={styles.settingIcon} />
              <Text style={styles.settingText}>My Categories</Text>
            </TouchableOpacity>
        </Link>
        
        <TouchableOpacity
          style={[styles.settingItem, { borderBottomWidth: 1 }]}
          onPress={() => router.push('/aboutModal')}
        >
            <Feather name="info" size={20} color="white" style={styles.settingIcon} />
            <Text style={styles.settingText}>About</Text>
          </TouchableOpacity>
      
        <TouchableOpacity
          style={[styles.settingItem, { borderBottomWidth: 0 }]}
          onPress={() => {refRBSheet.current.open();}}
        >
          <AntDesign name="delete" size={20} color="white" style={styles.settingIcon} />
          <Text style={styles.settingText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
      
      <RBSheet
        ref={refRBSheet}
        height={265}
        useNativeDriver={false}
        draggable={false}
        customStyles={{
          wrapper: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
          draggableIcon: {
            backgroundColor: '#ccc',
          },
          container: {
            backgroundColor: Colours.bg_colour,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 10,
          },
        }}
        customModalProps={{
          animationType: 'fade',
          statusBarTranslucent: true,
        }}
        customAvoidingViewProps={{
          enabled: true,
          behavior: 'padding',
          keyboardVerticalOffset: -40,
        }}>
        <View style={styles.bottomSheetContainer}>
          <View style={styles.bottomSheetHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.bottomSheetTitle}>Delete Account - </Text>
              <Text style={styles.bottomSheetTitle1}>{userDetail?.email || 'user@email.com'}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => refRBSheet.current.close()}
              style={styles.closeButton}
            >
              <AntDesign name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.bottomSheetContent}>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="gray"
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleDeleteAccount();
              }}
            >
              <AntDesign name="delete" size={20} color="red" style={styles.deleteIcon} />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </TouchableOpacity>
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={18} color="red" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </RBSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colours.bg_colour,
  },
  userProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colours.header_colour,
    width: '90%',
    padding: 20,
    borderRadius: 15,
    marginTop: 25,
  },
  userInfo: {
    marginLeft: 15,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: 'white',
  },
  userEmail: {
    fontSize: 15,
    color: 'white',
  },
  logOutButtonContainer: {
    width: '90%',
    marginTop: 15,
    alignItems: 'center',
  },
  logOutButton: {
    flexDirection: 'row',
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logOutIcon: {
    marginRight: 8,
  },
  logOutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  settingsLabelContainer: {
    width: '90%',
    alignItems: 'flex-start',
    marginTop: 15,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colours.primary_colour,
    marginBottom: 10,
    marginLeft: 8, 
  },
  settingsContainer: {
    width: '90%',
    borderRadius: 15,
    marginTop: 0,
    alignItems: 'center',
    backgroundColor: Colours.header_colour,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingIcon: {
    marginRight: 15,
  },
  settingText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  notificationSwitch: {
    marginLeft: 'auto',
  },
  bottomSheetContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  bottomSheetTitle1: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colours.tertiary_colour,
    flexShrink: 1,
  },
  closeButton: {
    padding: 5,
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
  },
  passwordInputContainer: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    marginBottom: 15,
  },
  passwordInput: {
    color: 'white',
    padding: 15,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 15,
  },
  deleteIcon: {
    marginRight: 10,
  },
  deleteButtonText: {
    color: 'red',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    justifyContent: 'center',
  },
  errorIcon: {
    marginRight: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
  },
});