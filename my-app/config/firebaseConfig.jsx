// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth , getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBmVzfN4FSJ_MNXkl3yApP3cpY8gOxyde4",
  authDomain: "inventorymanager-ca224.firebaseapp.com",
  projectId: "inventorymanager-ca224",
  storageBucket: "inventorymanager-ca224.firebasestorage.app",
  messagingSenderId: "902617132975",
  appId: "1:902617132975:web:d926a1be7316c5c112495a",
  measurementId: "G-RMV2DCJMTV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app,{
    persistence:getReactNativePersistence(ReactNativeAsyncStorage)
})

export const db=getFirestore(app);
