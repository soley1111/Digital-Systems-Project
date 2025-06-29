import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Colours from '../../constant/Colours';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanningEnabled, setIsScanningEnabled] = useState(true);
  const [isFlashOn, setIsFlashOn] = useState(false);
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
      // Disable scanning to prevent rapid multiple scans
      setIsScanningEnabled(false);
      setTimeout(() => {
        setIsScanningEnabled(true);
      }, 2000);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Disable scanning temporarily to prevent multiple navigations
    setIsScanningEnabled(false);

    // Navigate to editItemModal with the scanned itemID
    router.push({
      pathname: '/editItemModal',
      params: { itemId: data },
    });

    // Re-enable scanning after navigation
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
            enableTorch={isFlashOn}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.overlayRow} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.hole} />
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayRow} />
            <View style={styles.flashlightContainer}>
              <TouchableOpacity 
                onPress={() => {setIsFlashOn(!isFlashOn), Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}} 
                style={styles.flashlightButton}
              >
                <MaterialIcons 
                  name={isFlashOn ? "flashlight-on" : "flashlight-off"} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
            </View>
              <View style={styles.infobox}>
                <View style={styles.infoContainer}>
                <AntDesign style={styles.infoIcon} name="infocirlceo" size={18} color="white" />
                <Text style={styles.infoboxText}>
                  Scan a QR code to edit an item.
                </Text>
                </View>
              </View>
          </View>
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
    scanOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayRow: {
      flex: 1,
      width: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    overlayMiddle: {
      flexDirection: 'row',
    },
    overlaySide: {
      width: '50%',
      height: 240,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    hole: {
      width: 240,
      height: 240,
      borderRadius: 3,
      borderWidth: 2,
      borderColor: 'white',
    },
    infobox: {
      position: 'absolute',
      bottom: 25,
      backgroundColor: Colours.bg_colour,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoContainer: {
      padding: 10,
      flexDirection: 'row',
      alignItems: 'row',
    },
    infoboxText: {
      color: 'white',
      fontSize: 16,
      textAlign: 'center',
    },
    infoIcon: {
      marginRight: 10,
    },
    flashlightContainer: {
      position: 'absolute',
      bottom: 80,
      alignSelf: 'center',
    },
    flashlightButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });