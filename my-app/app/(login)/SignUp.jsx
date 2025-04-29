import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState } from 'react';
import Colours from '../../constant/Colours';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { userDetailContext } from '../../context/userDetailContext';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

// SIGN UP SCREEN

export default function SignUp() {
  const router = useRouter();

  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { userDetail, setUserDetail } = useState(userDetailContext);

  // Function to create a new account
  const CreateNewAccount = () => {
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then(async (resp) => {
        const user = resp.user;
        console.log(user);
        await SaveUser(user);
      })
      .catch((e) => {
        console.log(e.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        let error = '';

        switch (e.code) {
          case 'auth/email-already-in-use':
            error = 'Email address already in use.';
            break;
          case 'auth/invalid-email':
            error = 'Email address not valid.';
            break;
          case 'auth/weak-password':
            error = 'Password is too weak.';
            break;
          case 'auth/missing-password':
            error = 'Please enter a password.';
            break;
          default:
            break;
        }

        setErrorMessage(error);
      });
  };

  // Save User to Database
  const SaveUser = async (user) => {
    const data = {
      fullname: fullname,
      email: email,
      uid: user?.uid,
      hubs: [],
    };

    await setDoc(doc(db, 'users', email), data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Account created successfully, please sign in.');

    setUserDetail(data);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.backgroundBox} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topSection}>
          <Text style={styles.title}>CREATE ACCOUNT</Text>
          <Text style={styles.subtitle}>Please enter your details to create an account</Text>
        </View>

        <View style={styles.signUpBox}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="John Smith"
            placeholderTextColor="#ccc"
            onChangeText={(value) => setFullname(value)}
            autoCapitalize="words"
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="example@gmail.com"
            placeholderTextColor="#ccc"
            onChangeText={(value) => setEmail(value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••••"
            placeholderTextColor="#ccc"
            onChangeText={(value) => setPassword(value)}
            autoCapitalize="none"
          />

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••••"
            placeholderTextColor="#ccc"
            onChangeText={(value) => setConfirmPassword(value)}
            autoCapitalize="none"
          />
          
          <TouchableOpacity style={styles.signUpButton} onPress={CreateNewAccount}>
            <Text style={styles.signUpText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>
          
          <View style={styles.errorHolder}>
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={18} color="red" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View style={styles.fixedBottom}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back('(login)/SignIn')}>
          <AntDesign name="arrowleft" size={24} color="white" />
          <Text style={styles.backButtonText}>SIGN IN</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.bg_colour,
  },
  backgroundBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: Colours.header_colour,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 100,
  },
  topSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  signUpBox: {
    width: '100%',
    backgroundColor: Colours.header_colour,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    paddingLeft: 3,
    color: 'white',
  },
  input: {
    backgroundColor: '#3c364a',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    color: 'white',
  },
  signUpButton: {
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    marginTop: 15,
    padding: 15,
    alignItems: 'center',
  },
  signUpText: {
    color: 'white',
    fontWeight: 'bold',
  },
  fixedBottom: {
    position: 'absolute',
    bottom: 35,
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    justifyContent: 'center',
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  errorHolder: {
    alignItems: 'center',
    marginTop: 10,
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
});