import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import Colours from '../../constant/Colours';
import { AntDesign, Feather } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useRouter } from 'expo-router';

// Helper function to convert Firestore timestamps
const convertFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return new Date(timestamp);
};

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const refRBSheet = useRef();
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setRefreshing(true);
            fetchAlerts();
            generateAlerts();
          }}
          style={{ marginRight: 15 }}
        >
          <Feather name="refresh-ccw" size={20} color="#f9f9f9" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Fetch alerts from Firestore
  const fetchAlerts = async () => {
    try {
      const alertsRef = collection(db, 'alerts');
      const q = query(alertsRef, where('owner', '==', auth.currentUser?.email));
      const querySnapshot = await getDocs(q);
      
      const alertsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Forecasting helper functions with debug logging
  const calculateLinearForecast = (history, currentQuantity) => {
    console.log('[Linear Forecast] Calculating...');
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = history.length;
    
    history.forEach((entry, i) => {
      sumX += i;
      sumY += entry.newQuantity;
      sumXY += i * entry.newQuantity;
      sumX2 += i * i;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const result = slope > 0 ? Math.floor(currentQuantity / slope) : Infinity;
    
    console.log('[Linear Forecast] Result:', {
      slope,
      currentQuantity,
      daysRemaining: result
    });
    
    return result;
  };

  const calculateExponentialForecast = (history, currentQuantity, alpha = 0.3) => {
    console.log('[Exponential Forecast] Calculating...');
    let forecast = history[0].newQuantity;
    let totalUsage = 0;
    let usageDays = 0;
    
    for (let i = 1; i < history.length; i++) {
      if (history[i].newQuantity < history[i-1].newQuantity) {
        const usage = history[i-1].newQuantity - history[i].newQuantity;
        const prevDate = convertFirestoreTimestamp(history[i-1].date);
        const currDate = convertFirestoreTimestamp(history[i].date);
        const days = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (days > 0) {
          forecast = alpha * (usage / days) + (1 - alpha) * forecast;
          totalUsage += usage;
          usageDays += days;
          console.log(`[Exponential Forecast] Day ${i}:`, {
            date: currDate.toISOString().split('T')[0],
            usage,
            daysBetween: days.toFixed(2),
            dailyUsage: (usage/days).toFixed(2),
            forecast: forecast.toFixed(2)
          });
        }
      }
    }
    
    const avgDailyUsage = forecast;
    const result = avgDailyUsage > 0 ? Math.floor(currentQuantity / avgDailyUsage) : Infinity;
    
    console.log('[Exponential Forecast] Final:', {
      avgDailyUsage: avgDailyUsage.toFixed(2),
      currentQuantity,
      daysRemaining: result,
      totalUsage,
      usageDays
    });
    
    return result;
  };

  const calculateMovingAverageForecast = (history, currentQuantity, windowSize = 3) => {
    console.log('[Moving Avg Forecast] Calculating...');
    const usages = [];
    
    for (let i = 1; i < history.length; i++) {
      if (history[i].newQuantity < history[i-1].newQuantity) {
        const usage = history[i-1].newQuantity - history[i].newQuantity;
        const prevDate = convertFirestoreTimestamp(history[i-1].date);
        const currDate = convertFirestoreTimestamp(history[i].date);
        const days = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (days > 0) {
          usages.push(usage / days);
          console.log(`[Moving Avg] Point ${i}:`, {
            date: currDate.toISOString().split('T')[0],
            usage,
            daysBetween: days.toFixed(2),
            dailyUsage: (usage/days).toFixed(2)
          });
        }
      }
    }
    
    if (usages.length < windowSize) {
      console.log('[Moving Avg] Not enough data points');
      return Infinity;
    }
    
    let sum = 0;
    for (let i = usages.length - windowSize; i < usages.length; i++) {
      sum += usages[i];
    }
    
    const avgDailyUsage = sum / windowSize;
    const result = avgDailyUsage > 0 ? Math.floor(currentQuantity / avgDailyUsage) : Infinity;
    
    console.log('[Moving Avg] Final:', {
      avgDailyUsage: avgDailyUsage.toFixed(2),
      currentQuantity,
      daysRemaining: result,
      windowUsed: usages.slice(-windowSize).map(u => u.toFixed(2))
    });
    
    return result;
  };

  const calculateConfidence = (history) => {
    console.log('[Confidence] Calculating...');
    // Data points score (0-40 points)
    const dataPointsScore = Math.min(40, (history.length / 15) * 40);
    
    // Consistency score (0-30 points)
    let consistencyScore = 0;
    const changes = [];
    for (let i = 1; i < history.length; i++) {
      if (history[i].newQuantity < history[i-1].newQuantity) {
        changes.push(history[i-1].newQuantity - history[i].newQuantity);
      }
    }
    
    if (changes.length > 2) {
      const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
      const variance = changes.reduce((a, b) => a + Math.pow(b - avgChange, 2), 0) / changes.length;
      consistencyScore = 30 * (1 - Math.min(1, variance / (avgChange || 1)));
    }
    
    // Recency score (0-20 points)
    const now = new Date();
    const lastEntryDate = convertFirestoreTimestamp(history[history.length - 1].date);
    const daysSinceLastUpdate = (now - lastEntryDate) / (1000 * 60 * 60 * 24);
    const recencyScore = 20 * (1 - Math.min(1, daysSinceLastUpdate / 7));
    
    // Completeness score (0-10 points)
    const completeEntries = history.filter(e => e.date && e.newQuantity !== undefined).length;
    const completenessScore = 10 * (completeEntries / history.length);
    
    const totalScore = Math.min(100, Math.round(
      dataPointsScore + consistencyScore + recencyScore + completenessScore
    ));
    
    console.log('[Confidence] Breakdown:', {
      dataPoints: `${dataPointsScore.toFixed(1)}/40`,
      consistency: `${consistencyScore.toFixed(1)}/30`,
      recency: `${recencyScore.toFixed(1)}/20`,
      completeness: `${completenessScore.toFixed(1)}/10`,
      total: `${totalScore}/100`
    });
    
    return totalScore;
  };

  // Generate new alerts with comprehensive logging
  const generateAlerts = async () => {
    console.log('\n=== STARTING ALERT GENERATION ===');
    try {
      // Fetch inventory items
      const itemsRef = collection(db, 'items');
      const itemsQuery = query(itemsRef, where('owner', '==', auth.currentUser?.email));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const items = await Promise.all(itemsSnapshot.docs.map(async (itemDoc) => {
        const itemData = itemDoc.data();
        return {
          id: itemDoc.id,
          name: itemData.name || 'Unnamed Item',
          quantity: itemData.quantity || 0,
          minStock: itemData.minStock || 1,
          editHistory: itemData.editHistory || [],
          ...itemData
        };
      }));
  
      // Check for existing alerts
      const existingAlertsRef = collection(db, 'alerts');
      const existingAlertsQuery = query(existingAlertsRef, where('owner', '==', auth.currentUser?.email));
      const existingAlertsSnapshot = await getDocs(existingAlertsQuery);
      const existingAlertIds = existingAlertsSnapshot.docs.map(doc => doc.id);
  
      const newAlerts = [];
      
      console.log(`Processing ${items.length} items...`);
      items.forEach(item => {
        console.log(`\n[Item] ${item.name} (ID: ${item.id})`);
        console.log(`- Current: ${item.quantity}, Min stock: ${item.minStock}`);
        console.log(`- History entries: ${item.editHistory?.length || 0}`);

        // Low stock alerts
        if (item.minStock && item.quantity <= item.minStock) {
          const alertId = `low-stock-${item.id}`;
          if (!existingAlertIds.includes(alertId)) {
            console.log('[Alert] Creating LOW STOCK alert');
            newAlerts.push({
              id: alertId,
              type: 'low_stock',
              title: 'Low Stock Alert',
              message: `'${item.name}' is running low (${item.quantity} remaining, threshold: ${item.minStock})`,
              itemId: item.id,
              severity: 'high',
              timestamp: serverTimestamp(),
              read: false,
              owner: auth.currentUser?.email,
              actionTaken: false
            });
          }
        }
        
        // Out of stock alerts
        if (item.quantity === 0) {
          const alertId = `no-stock-${item.id}`;
          if (!existingAlertIds.includes(alertId)) {
            console.log('[Alert] Creating OUT OF STOCK alert');
            newAlerts.push({
              id: alertId,
              type: 'no_stock',
              title: 'Out of Stock',
              message: `'${item.name}' is completely out of stock`,
              itemId: item.id,
              severity: 'medium',
              timestamp: serverTimestamp(),
              read: false,
              owner: auth.currentUser?.email,
              actionTaken: false
            });
          }
        }
        
        // Predictive alerts
        if (item.editHistory && item.editHistory.length >= 10) {
          console.log('[Predictive] Checking history...');
          const validHistory = item.editHistory
            .filter(entry => {
              const isValid = entry.date && entry.newQuantity !== undefined;
              if (!isValid) console.log('[Predictive] Skipping invalid entry:', entry);
              return isValid;
            })
            .sort((a, b) => {
              const dateA = convertFirestoreTimestamp(a.date);
              const dateB = convertFirestoreTimestamp(b.date);
              return dateA - dateB;
            });
          
          console.log(`[Predictive] Valid entries: ${validHistory.length}/${item.editHistory.length}`);
          
          if (validHistory.length >= 7) {
            console.log('[Predictive] First entry:', {
              date: convertFirestoreTimestamp(validHistory[0].date).toISOString().split('T')[0],
              qty: validHistory[0].newQuantity
            });
            console.log('[Predictive] Last entry:', {
              date: convertFirestoreTimestamp(validHistory[validHistory.length-1].date).toISOString().split('T')[0],
              qty: validHistory[validHistory.length-1].newQuantity
            });
            
            const linearDays = calculateLinearForecast(validHistory, item.quantity);
            const expoSmoothDays = calculateExponentialForecast(validHistory, item.quantity);
            const movingAvgDays = calculateMovingAverageForecast(validHistory, item.quantity);
            
            const daysRemaining = Math.min(
              linearDays * 0.5 + 
              expoSmoothDays * 0.3 + 
              movingAvgDays * 0.2
            );
            
            console.log('[Predictive] Combined forecast:', {
              linear: `${linearDays} days`,
              exponential: `${expoSmoothDays} days`,
              movingAvg: `${movingAvgDays} days`,
              weighted: `${daysRemaining.toFixed(1)} days`
            });
            
            if (daysRemaining < 14 && daysRemaining !== Infinity) {
              const alertId = `predictive-${item.id}`;
              if (!existingAlertIds.includes(alertId)) {
                const confidence = calculateConfidence(validHistory);
                console.log('[Alert] Creating PREDICTIVE alert', {
                  daysRemaining: Math.round(daysRemaining),
                  confidence: `${confidence}%`
                });
                
                newAlerts.push({
                  id: alertId,
                  type: 'predictive',
                  title: 'Restock Forecast',
                  message: `'${item.name}' will run out in ~${Math.round(daysRemaining)} days`,
                  itemId: item.id,
                  severity: daysRemaining < 5 ? 'high' : 'medium',
                  timestamp: serverTimestamp(),
                  read: false,
                  owner: auth.currentUser?.email,
                  actionTaken: false,
                  confidence: confidence,
                });
              }
            } else {
              console.log('[Predictive] No alert needed', {
                reason: daysRemaining === Infinity ? 'Infinite days remaining' : `${daysRemaining} days (>= 14)`
              });
            }
          } else {
            console.log('[Predictive] Skipped - Not enough valid entries');
          }
        } else {
          console.log('[Predictive] Skipped - Not enough history');
        }
      });
  
      // Save new alerts
      if (newAlerts.length > 0) {
        console.log(`\nSaving ${newAlerts.length} new alerts...`);
        await Promise.all(newAlerts.map(alert => 
          setDoc(doc(db, 'alerts', alert.id), alert)
        ));
      } else {
        console.log('\nNo new alerts to save');
      }
      
      fetchAlerts();
    } catch (error) {
      console.error('!!! Alert generation failed:', error);
    }
    console.log('=== ALERT GENERATION COMPLETE ===\n');
  };

  const markAsRead = async (alertId) => {
    try {
      await setDoc(doc(db, 'alerts', alertId), {
        read: true
      }, { merge: true });
      fetchAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAsUnread = async (alertId) => {
    try {
      await setDoc(doc(db, 'alerts', alertId), {
        read: false
      }, { merge: true });
      fetchAlerts();
    } catch (error) {
      console.error('Error marking alert as unread:', error);
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await deleteDoc(doc(db, 'alerts', alertId));
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    generateAlerts();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchAlerts();
      generateAlerts();
    }, [])
  );

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchAlerts();
    generateAlerts();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.alertContainer,
        item.severity === 'high' && styles.highSeverity,
        item.severity === 'medium' && styles.mediumSeverity,
        item.read && styles.readAlert
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!item.read) {
          markAsRead(item.id);
        }
      }}
    >
      <View style={styles.alertHeader}>
        <Text style={[styles.alertTitle, item.read && styles.readText]}>{item.title}</Text>
        <View style={styles.alertActions}>
          <Text style={[styles.alertTimestamp, item.read && styles.readText]}>
            {new Date(item.timestamp?.toDate()).toLocaleString([], {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedAlert(item);
              refRBSheet.current.open();
            }}
          >
            <Feather name="more-vertical" size={20} color="#aaa" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.alertMessage, item.read && styles.readText]}>{item.message}</Text>
      {item.type === 'predictive' && (
        <Text style={[styles.alertMessage, { fontSize: 12, marginTop: 5 }]}>
          Confidence: {item.confidence}%
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? 'Loading alerts...' : 'No alerts to display'}
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colours.primary_colour]}
            tintColor={Colours.primary_colour}
          />
        }
      />

      {/* Bottom Sheet for Alert Actions */}
      <RBSheet
        ref={refRBSheet}
        height={265}
        useNativeDriver={false}
        closeOnPressMask={true}
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
          enabled: false,
        }}
      >
        <View style={styles.bottomSheetContainer}>
          <View style={styles.bottomSheetHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.bottomSheetTitle}>Alert Settings - </Text>
              <Text style={styles.bottomSheetTitle1}>{selectedAlert?.title || 'Selected Alert'}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => refRBSheet.current.close()}
              style={styles.closeButton}
            >
              <AntDesign name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingsContainer}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (selectedAlert?.read) {
                  markAsUnread(selectedAlert.id);
                } else {
                  markAsRead(selectedAlert.id);
                }
                refRBSheet.current.close();
              }}
            >
              <Feather name={selectedAlert?.read ? "eye-off" : "eye"} size={20} color="white" style={styles.settingIcon} />
              <Text style={styles.settingText}>
                {selectedAlert?.read ? 'Mark as Unread' : 'Mark as Read'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: 'editItemModal',
                  params: { itemId: selectedAlert?.itemId },
                });
                refRBSheet.current.close();
              }}
            >
              <Feather name="package" size={20} color="white" style={styles.settingIcon} />
              <Text style={styles.settingText}>View Item</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingItem, styles.deleteItem]}
              onPress={() => {
                deleteAlert(selectedAlert.id);
                refRBSheet.current.close();
              }}
            >
              <Feather name="trash-2" size={20} color="red" style={styles.settingIcon} />
              <Text style={[styles.settingText, { color: 'red' }]}>Delete Alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RBSheet>
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
  listContent: {
    padding: 16,
  },
  alertContainer: {
    backgroundColor: Colours.header_colour,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  readAlert: {
    opacity: 0.7,
  },
  highSeverity: {
    borderLeftWidth: 4,
    borderLeftColor: Colours.error_colour,
  },
  mediumSeverity: {
    borderLeftWidth: 4,
    borderLeftColor: Colours.warning_colour,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  readText: {
    color: '#aaa',
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertMessage: {
    fontSize: 14,
    color: '#ccc',
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#aaa',
    marginRight: 10,
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
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
  settingsContainer: {
    width: '100%',
    borderRadius: 15,
    backgroundColor: Colours.header_colour,
    marginBottom: 20,
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
  deleteItem: {
    borderBottomWidth: 0,
  },
});