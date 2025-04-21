import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useContext } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import Colours from '../../constant/Colours';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { UserDetailContext } from '../../context/userDetailContext';
import { Modal } from '../../components/Modal';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

// SIGN IN SCREEN
// COMPLETED

export default function SignIn() {
  const router = useRouter();

  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');


  // Function to send password reset email
  const sendPasswordReset = async (email) => {
    try {
      // Check if the email exists in the database
      const userDoc = await getDoc(doc(db, 'users', email));
      if (!userDoc.exists()) {
        Alert.alert('Error', 'No account found with this email address.');
        return;
      }

      // If the email exists, send the password reset email
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Success', 'Password reset email sent successfully!');
    } catch (error) {
      const errorMessage = error.message;
      console.log(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  };


  // Function to handle password reset inside modal
  const onForgotPassword = () => {
    if (!forgotEmail) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    sendPasswordReset(forgotEmail);
    setIsModalOpen(false);
  };

  // Function to handle sign-in
  const onSignInClick = () => {
    setLoading(true);
    setErrorMessage(''); // Clear any previous error message
    signInWithEmailAndPassword(auth, email, password)
      .then(async () => {
        console.log('User signed in!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await getUserDetails();
        setLoading(false);
        router.replace('(tabs)');
      })
      .catch((e) => {
        console.log(e.message);
        let error = '';
        switch (e.code) {
          case 'auth/missing-password':
            error = 'Please enter a password.';
            break;
          case 'auth/invalid-credential':
            error = 'Invalid credentials. Please try again.';
            break;
          case 'auth/invalid-email':
            error = 'Invalid email address.';
            break;
          case 'auth/missing-email':
            error = 'Please enter an email address.';
            break;
          default:
            error = 'An error occurred. Please try again.';
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMessage(error);
        setLoading(false);
      });
  };

  const getUserDetails = async () => {
    const result = await getDoc(doc(db, 'users', email));
    console.log(result.data());
    setUserDetail(result.data());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SIGN IN</Text>
      <Text style={styles.subtitle}>Please sign in to your existing account</Text>

      <View style={styles.signInBox}>
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="example@gmail.com"
          placeholderTextColor="#ccc"
          onChangeText={(value) => setEmail(value)}
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="••••••••••"
          placeholderTextColor="#ccc"
          onChangeText={(value) => setPassword(value)}
        />

        <TouchableOpacity style={styles.loginButton} onPress={onSignInClick} disabled={loading}>
          {!loading ? <Text style={styles.loginText}>SIGN IN</Text> : <ActivityIndicator size={'17'} color={'white'} />}
        </TouchableOpacity>

        <Text style={styles.signupText}>
          Don't have an account?{' '}
          <Text style={styles.signupLink} onPress={() => router.navigate('(login)/SignUp')}>
            SIGN UP
          </Text>
        </Text>

        <TouchableOpacity onPress={() => setIsModalOpen(true)}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
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

      {/* Forgot Password Modal */}
      <Modal isOpen={isModalOpen} withInput={true}>
        <View style={styles.modalContent}>
          
          <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalOpen(false)}>
            <AntDesign name="close" size={18} color="white" />
          </TouchableOpacity>

          
          <Text style={styles.modalTitle}>Forgot Password</Text>

          
          <Text style={styles.modalDescription}>
            Enter your email below, and we'll send you a link to reset your password.
          </Text>

          
          <TextInput
            style={styles.modalInput}
            placeholder="Enter your email"
            placeholderTextColor="#B0B0B0"
            onChangeText={(value) => setForgotEmail(value)}
          />

          
          <TouchableOpacity style={styles.modalButton} onPress={onForgotPassword}>
            <Text style={styles.modalButtonText}>Send Reset Link</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: Colours.bg_colour,
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
  signInBox: {
    width: '100%',
    flex: 0.75,
    backgroundColor: Colours.header_colour,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
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
  forgotPassword: {
    color: Colours.tertiary_colour,
    textAlign: 'center',
    paddingTop: 10,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    marginTop: 25,
    padding: 15,
    alignItems: 'center',
  },
  loginText: {
    color: 'white',
    fontWeight: 'bold',
  },
  signupText: {
    textAlign: 'center',
    marginTop: 20,
    color: 'white',
  },
  signupLink: {
    color: Colours.tertiary_colour,
    fontWeight: 'bold',
  },
  modalContent: {
    backgroundColor: Colours.bg_colour,
    padding: 10,
    borderRadius: 10,
    width: '100%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: 'white',
  },
  modalInput: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginBottom: 15,
    color: 'white',
  },
  modalDescription: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 5,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
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