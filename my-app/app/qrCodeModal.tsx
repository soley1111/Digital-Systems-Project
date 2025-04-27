import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import { AntDesign, Feather } from '@expo/vector-icons';
import Colours from '../constant/Colours';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import * as Haptics from 'expo-haptics';

interface ItemData {
  id: string;
  name: string;
  sku: string;
}

export default function QRCodeModal() {
  const params = useLocalSearchParams();
  const itemId = params.itemId as string;
  const router = useRouter();
  
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeSize, setQrCodeSize] = useState(250);
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const qrCodeRef = React.useRef<any>(null);

  useEffect(() => {
    const fetchItemData = async () => {
      try {
        if (!itemId) {
          throw new Error('No item ID provided');
        }

        const itemRef = doc(db, 'items', itemId);
        const itemSnap = await getDoc(itemRef);
        
        if (!itemSnap.exists()) {
          throw new Error('Item not found');
        }

        const item = itemSnap.data();
        setItemData({
          id: itemSnap.id,
          name: item.name || 'Unnamed Item',
          sku: item.sku || 'N/A',
        });
      } catch (err) {
        console.error('Error fetching item data:', err);
        setError(err.message || 'Failed to load item data');
      } finally {
        setLoading(false);
      }
    };

    fetchItemData();
  }, [itemId]);

  useEffect(() => {
    const requestMediaPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission',
              message: 'App needs access to your storage to save QR codes',
              buttonPositive: 'OK',
            }
          );
          setHasMediaPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } else {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          setHasMediaPermission(status === 'granted');
        }
      } catch (err) {
        console.error('Error requesting media permission:', err);
      }
    };

    requestMediaPermission();
  }, []);

  const handleShareQR = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (!qrCodeRef.current) {
        throw new Error('QR code not ready');
      }

      const uri = await captureRef(qrCodeRef, {
        format: 'png',
        quality: 1,
      });

      await Share.share({
        url: uri,
        title: `QR Code for ${itemData?.name || 'Item'}`,
        message: `Here's the QR code for ${itemData?.name || 'this item'}`,
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert('Error', 'Failed to share QR code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSaveQR = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (!qrCodeRef.current) {
        throw new Error('QR code not ready');
      }

      if (!hasMediaPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant storage permissions to save QR codes',
          [{ text: 'OK' }]
        );
        return;
      }

      const uri = await captureRef(qrCodeRef, {
        format: 'png',
        quality: 1,
      });

      if (Platform.OS === 'android') {
        const downloadsDir = FileSystem.documentDirectory + 'Download/';
        const fileName = `QR_${itemData?.id || Date.now()}.png`;
        const fileUri = downloadsDir + fileName;

        await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
        await FileSystem.moveAsync({
          from: uri,
          to: fileUri,
        });

        Alert.alert(
          'Success',
          `QR code saved to Downloads folder as ${fileName}`,
          [{ text: 'OK' }]
        );
      } else {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Success', 'QR code saved to your photo library', [{ text: 'OK' }]);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colours.primary_colour} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!itemData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Item data not available</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <AntDesign name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>ITEM QR CODE</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      <View style={styles.content}>
        <Text style={styles.itemName}>{itemData.name}</Text>
        <View 
          ref={qrCodeRef}
          style={styles.qrCodeContainer}
          collapsable={false}
        >
          <QRCode
            value={itemData.id}
            size={qrCodeSize}
            color="black"
            backgroundColor="white"
            quietZone={10}
          />
          <View style={styles.qrCodeFooter}>
            <View style={styles.qrCodeFooterRow}>
              <Text style={styles.qrCodeFooterLabel}>ITEM NAME: </Text>
              <Text style={styles.qrCodeFooterValue}>{itemData.name}</Text>
            </View>
            <View style={styles.qrCodeFooterRow}>
              <Text style={styles.qrCodeFooterLabel}>SKU: </Text>
              <Text style={styles.qrCodeFooterValue}>{itemData.sku}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.qrCodeText}>Scan this code to view item details</Text>
        <View style={styles.sizeControls}>
          <Text style={styles.sizeLabel}>Size:</Text>
          <TouchableOpacity 
            onPress={() => setQrCodeSize(Math.max(150, qrCodeSize - 50))}
            disabled={qrCodeSize <= 150}
            style={[
              styles.sizeButton,
              qrCodeSize <= 150 && styles.disabledButton
            ]}
          >
            <AntDesign name="minuscircle" size={24} color={Colours.tertiary_colour} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setQrCodeSize(Math.min(350, qrCodeSize + 50))}
            disabled={qrCodeSize >= 350}
            style={[
              styles.sizeButton,
              qrCodeSize >= 350 && styles.disabledButton
            ]}
          >
            <AntDesign name="pluscircle" size={24} color={Colours.tertiary_colour} />
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShareQR}
          >
            <Feather name="share-2" size={20} color="white" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSaveQR}
          >
            <Feather name="download" size={20} color="white" />
            <Text style={styles.actionButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.bg_colour,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colours.bg_colour,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colours.bg_colour,
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colours.primary_colour,
  },
  headerRightPlaceholder: {
    width: 34,
  },
  backButtonText: {
    color: Colours.tertiary_colour,
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
  },
  itemName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeFooter: {
    marginTop: 15,
    width: '100%',
  },
  qrCodeFooterRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  qrCodeFooterLabel: {
    color: 'black',
    fontSize: 14,
    fontWeight: '600',
  },
  qrCodeFooterValue: {
    color: 'black',
    fontSize: 14,
    fontWeight: '400',
  },
  qrCodeText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
  },
  sizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  sizeLabel: {
    color: 'white',
    marginRight: 15,
    fontSize: 16,
  },
  sizeButton: {
    marginHorizontal: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    marginHorizontal: 10,
  },
  shareButton: {
    backgroundColor: Colours.header_colour,
  },
  saveButton: {
    backgroundColor: Colours.tertiary_colour,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});