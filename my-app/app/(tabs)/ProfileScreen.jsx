import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import React, { useState, useContext } from 'react';
import { TouchableOpacity } from 'react-native';
import { signOut, getAuth, deleteUser, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import { Modal } from '../../components/Modal';
import Colours from '../../constant/Colours';
import Feather from '@expo/vector-icons/Feather';
import { UserDetailContext } from '../../context/userDetailContext';
import ProfileImage from '../../components/ProfileImage';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Link } from 'expo-router';
import { Switch } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { userDetail } = useContext(UserDetailContext);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  const toggleNotifications = () => {
    setIsNotificationsEnabled((previousState) => !previousState);
    // Add logic here to handle enabling/disabling notifications
  };


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

  // Function to handle account deletion
  const handleDeleteAccount = async () => {
    const user = auth.currentUser;

    if (!user) {
      setErrorMessage('No user is currently signed in.');
      return;
    }

    try {
      // Re-authenticate the user
      await signInWithEmailAndPassword(auth, user.email, password);

      // Delete the user
      await deleteUser(user);
      Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
      router.replace('(login)');
    } catch (e) {
      let error = '';
      switch (e.code) {
        case 'auth/missing-password':
          error = 'Please enter your password.';
          break;
        case 'auth/wrong-password':
          error = 'Incorrect password. Please try again.';
          break;
        case 'auth/too-many-requests':
          error = 'Too many attempts. Please try again later.';
          break;
        default:
          error = 'An error occurred. Please try again.';
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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Add haptic feedback
          handleSignOut(); // Existing delete functionality
        }}>
          <Feather name="log-out" size={18} color="white" style={styles.logOutIcon} />
          <Text style={styles.logOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.settingsLabelContainer}>
        <Text style={styles.settingsLabel}>App Settings</Text>
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
        <View style={styles.settingItem}>
          <Feather name="bell" size={20} color="white" style={styles.settingIcon} />
          <Text style={styles.settingText}>Notifications</Text>
          <Switch
            value={isNotificationsEnabled}
            onValueChange={toggleNotifications}
            thumbColor={isNotificationsEnabled ? Colours.primary_colour : 'gray'}
            trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: Colours.tertiary_colour }}
            style={styles.notificationSwitch}
          />
      </View>
          <TouchableOpacity style={styles.settingItem}>
            <Feather name="info" size={20} color="white" style={styles.settingIcon} />
            <Text style={styles.settingText}>About</Text>
          </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => setIsModalOpen(true)}>
          <AntDesign name="delete" size={20} color="white" style={styles.settingIcon} />
          <Text style={styles.settingText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
      
      {/* Modal for account deletion */}
      <Modal isOpen={isModalOpen} withInput={true}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Account Deletion</Text>
          <Text style={styles.modalDescription}>
            Please enter your password to confirm the deletion of your account.
          </Text>

          <TextInput
            style={styles.modalInput}
            secureTextEntry
            placeholder="Enter your password"
            placeholderTextColor="#B0B0B0"
            onChangeText={(value) => setPassword(value)}
          />

          {/* Error Message */}
          <View style={styles.errorHolder}>
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={18} color="red" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.modalButton} onPress={handleDeleteAccount}>
            <Text style={styles.modalButtonText}>Delete Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsModalOpen(false)}>
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  buttonContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    width: '100%',
  },
  button1: {
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    padding: 12,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  button2: {
    backgroundColor: 'red',
    borderRadius: 10,
    padding: 12,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContent: {
    backgroundColor: Colours.bg_colour,
    padding: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  modalDescription: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginBottom: 0,
  },
  errorHolder: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  errorIcon: {
    marginRight: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: 'gray',
  },
  logOutButtonContainer: {
    width: '90%', // Match the width of userProfileContainer
    marginTop: 15, // Slightly below the userProfileContainer
    alignItems: 'center',
  },
  logOutButton: {
    flexDirection: 'row', // To align the icon and text horizontally
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logOutIcon: {
    marginRight: 8, // Space between the icon and text
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
    height: 415,
    borderRadius: 15,
    marginTop: 0,
    alignItems: 'center',
    backgroundColor: Colours.header_colour,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)', // Light border color
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
    marginLeft: 'auto', // Push the switch to the right
  },
});