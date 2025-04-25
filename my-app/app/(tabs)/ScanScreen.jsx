import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Colours from '../../constant/Colours';

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanningEnabled, setIsScanningEnabled] = useState(true);
  const isPermissionGranted = Boolean(permission?.granted);
  const router = useRouter();

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  // Function to validate the scanned item ID format
  const isValidItemId = (id) => {
    // 20 alphanumeric characters
    const itemIdRegex = /^[A-Za-z0-9]{20}$/;
    return itemIdRegex.test(id);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (!isScanningEnabled) return; // Skip if scanning is temporarily disabled
    
    console.log('Scanned data:', data);

    // Validate the scanned data
    if (!isValidItemId(data)) {
      console.log('Invalid item ID format');
      // Temporarily disable scanning to prevent rapid multiple scans
      setIsScanningEnabled(false);
      setTimeout(() => {
        setIsScanningEnabled(true);
      }, 2000);
      return;
    }

    console.log('Valid itemID:', data);
    
    // Disable scanning temporarily to prevent multiple navigations
    setIsScanningEnabled(false);

    // Navigate to editItemModal with the scanned itemID
    router.push({
      pathname: '/editItemModal',
      params: { itemId: data },
    });

    // Re-enable scanning after navigation (in case user comes back)
    setTimeout(() => {
      setIsScanningEnabled(true);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {isPermissionGranted ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={isScanningEnabled ? handleBarcodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'], // Only scan QR codes
            }}
          />
          {!isScanningEnabled && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="white" />
            </View>
          )}
        </>
      ) : (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Please grant camera access to scan QR codes.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Allow Access</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colours.bg_colour,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    permissionText: {
      color: '#ccc',
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 10,
    },
    permissionButton: {
      backgroundColor: Colours.tertiary_colour,
      padding: 10,
      borderRadius: 10,
      width: 330,
      alignItems: 'center',
      justifyContent: 'center',
      height: 50,
    },
    permissionButtonText: {
      color: Colours.primary_colour,
      fontSize: Colours.medium_size,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });