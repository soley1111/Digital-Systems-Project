import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import React, { useContext, useState, useEffect } from 'react';
import Colours from '../../constant/Colours';
import { UserDetailContext } from '../../context/userDetailContext';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import { LineChart } from 'react-native-chart-kit';
import RBSheet from 'react-native-raw-bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';

export default function HomeScreen() {
  const { userDetail } = useContext(UserDetailContext);
  const router = useRouter();
  const [stockMetrics, setStockMetrics] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [dailyStockData, setDailyStockData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingSheetRef = useRef();

  // Check if user has completed onboarding
  const checkOnboardingStatus = async () => {
    try {
      if (!auth.currentUser?.email) return;
      
      const userRef = doc(db, 'users', auth.currentUser.email);
      const userDoc = await getDoc(userRef);
      
      // If user document exists and has completed onboarding, return
      if (userDoc.exists() && userDoc.data().onboardingCompleted) {
        return false;
      }
      
      // Check if user has any items or hubs
      const itemsRef = collection(db, 'items');
      const itemsQuery = query(itemsRef, where('owner', '==', auth.currentUser.email));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const hubsRef = collection(db, 'hubs');
      const hubsQuery = query(hubsRef, where('owner', '==', auth.currentUser.email));
      const hubsSnapshot = await getDocs(hubsQuery);
      
      // Show onboarding if no items and no hubs
      if (itemsSnapshot.empty && hubsSnapshot.empty) {
        return true;
      } else {
        // Mark onboarding as completed if they have items/hubs
        await setDoc(userRef, { onboardingCompleted: true }, { merge: true });
        return false;
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  };

  // Function to calculate stock metrics and prepare chart data
  const calculateStockMetrics = async () => {
    try {
      const itemsRef = collection(db, 'items');
      const q = query(itemsRef, where('owner', '==', auth.currentUser?.email));
      const querySnapshot = await getDocs(q);
  
      let totalItems = 0;
      let lowStock = 0;
      let outOfStock = 0;
      let allActivity = [];
      const dailyStockLevels = {};
  
      // First get current stock levels and collect all activity
      querySnapshot.forEach((doc) => {
        const item = doc.data();
        totalItems += item.quantity || 0;
        
        if (item.quantity === 0) {
          outOfStock++;
        } else if (item.quantity <= (item.minStock || 0)) {
          lowStock++;
        }
  
        // Collect edit history if it exists
        if (item.editHistory && item.editHistory.length > 0) {
          item.editHistory.forEach(history => {
            const historyDate = history.date.toDate();
            const dateKey = historyDate.toISOString().split('T')[0]; // YYYY-MM-DD
            
            allActivity.push({
              ...history,
              itemId: doc.id,
              itemName: item.name,
              date: historyDate
            });
          });
        }
      });
  
      // Sort activity by date (oldest first)
      const sortedActivity = allActivity.sort((a, b) => a.date - b.date);
  
      // Initialize with current date and total
      const today = new Date();
      const todayKey = today.toISOString().split('T')[0];
      dailyStockLevels[todayKey] = totalItems;
  
      // Create a map of all changes by date
      const changesByDate = {};
      sortedActivity.forEach(activity => {
        const dateKey = activity.date.toISOString().split('T')[0];
        if (!changesByDate[dateKey]) {
          changesByDate[dateKey] = [];
        }
        changesByDate[dateKey].push(activity);
      });
  
      // Get all unique dates with changes (sorted oldest to newest)
      const allDates = Object.keys(changesByDate).sort();
  
      // Initialize with current stock
      let currentStock = totalItems;
      
      // If we have changes, process them from newest to oldest
      if (allDates.length > 0) {
        for (let i = allDates.length - 1; i >= 0; i--) {
          const dateKey = allDates[i];
          const dateChanges = changesByDate[dateKey];
          
          // Calculate net change for this date
          let netChange = 0;
          dateChanges.forEach(change => {
            netChange += change.newQuantity - change.previousQuantity;
          });
  
          // The stock level before these changes is current stock minus net change
          const stockBeforeChanges = currentStock - netChange;
          
          // Set the stock level for this date (after changes)
          dailyStockLevels[dateKey] = currentStock;
          
          // Set the stock level for the day before these changes
          currentStock = stockBeforeChanges;
        }
      }
  
      // Prepare chart data - get last 7 days including today
      const chartLabels = [];
      const chartData = [];
      const now = new Date();
  
      // Find the most recent known stock level before each date
      const getStockForDate = (targetDate) => {
        const targetDateKey = targetDate.toISOString().split('T')[0];
        
        // If we have exact data for this date, use it
        if (dailyStockLevels[targetDateKey] !== undefined) {
          return dailyStockLevels[targetDateKey];
        }
        
        // Otherwise find the most recent data before this date
        const knownDates = Object.keys(dailyStockLevels).sort();
        for (let i = knownDates.length - 1; i >= 0; i--) {
          const knownDate = new Date(knownDates[i]);
          if (knownDate < targetDate) {
            return dailyStockLevels[knownDates[i]];
          }
        }
        
        // If no older data exists, use current total
        return totalItems;
      };
  
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        // Format label as "DD/MM"
        chartLabels.push(`${date.getDate()}/${date.getMonth() + 1}`);
        
        // Get the stock level for this date
        chartData.push(getStockForDate(date));
      }
  
      setDailyStockData({
        labels: chartLabels,
        datasets: [{
          data: chartData
        }]
      });
  
      // Sort activity by date (newest first) for display
      setRecentActivity(allActivity.sort((a, b) => b.date - a.date).slice(0, 20));
      setStockMetrics({
        totalItems,
        lowStock,
        outOfStock
      });
      setLoadingChart(false);
  
    } catch (error) {
      console.error('Error calculating stock metrics:', error);
      setLoadingChart(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    const initialize = async () => {
      await calculateStockMetrics();
      const shouldShowOnboarding = await checkOnboardingStatus();
      setShowOnboarding(shouldShowOnboarding);
    };
    initialize();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      calculateStockMetrics();
      if (showOnboarding) {
        setTimeout(() => {
          onboardingSheetRef.current?.open();
        }, 1000);
      }
    }, [showOnboarding])
  );

  // Mark onboarding as completed
  const completeOnboarding = async () => {
    try {
      if (!auth.currentUser?.email) return;
      
      const userRef = doc(db, 'users', auth.currentUser.email);
      await setDoc(userRef, { onboardingCompleted: true }, { merge: true });
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error marking onboarding as complete:', error);
    }
  };

  // Render item for the FlatList
  const renderActivityItem = ({ item }) => (
    <View style={styles.activityItem}>
      <Text style={styles.activityItemText}>
        <Text style={{ fontWeight: 'bold' }}>'{item.itemName}'</Text>
        <Text> stock changed from </Text>
        <Text style={{ color: Colours.tertiary_colour }}>{item.previousQuantity}</Text>
        <Text> to </Text>
        <Text style={{ color: Colours.tertiary_colour }}>{item.newQuantity}</Text>
      </Text>
      <Text style={styles.activityItemDate}>
        {item.date.toLocaleDateString()} at {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.graphSection}>
        <Text style={styles.sectionHeader}>Inventory Trends (7 Days)</Text>
        <View style={styles.graphBox}>
          {loadingChart ? (
            <Text style={styles.graphPlaceholder}>Loading chart...</Text>
          ) : dailyStockData.labels && dailyStockData.labels.length > 0 ? (
            <LineChart
              data={{
                labels: dailyStockData.labels,
                datasets: dailyStockData.datasets,
              }}
              width={Dimensions.get('window').width - 40}
              height={180}
              yAxisLabel=""
              yAxisSuffix=""
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: Colours.header_colour,
                backgroundGradientFrom: Colours.header_colour,
                backgroundGradientTo: Colours.header_colour,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "5",
                  strokeWidth: "1",
                  stroke: "#ffffff",
                  fill: "#ffffff"
                },
                propsForBackgroundLines: {
                  strokeWidth: 0.2,
                  stroke: 'rgba(255, 255, 255, 0.2)'
                },
                propsForLabels: {
                  fontSize: 10
                },
                strokeWidth: 2,
                color: (opacity = 1) => Colours.tertiary_colour,
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              withHorizontalLabels={true}
              withVerticalLabels={true}
              withInnerLines={true}
              withOuterLines={false}
            />
          ) : (
            <Text style={styles.graphPlaceholder}>No data available for chart</Text>
          )}
        </View>
      </View>

      <View style={styles.boxesRow}>
        <View style={styles.box}>
          <AntDesign name="linechart" size={24} color={Colours.tertiary_colour} style={styles.boxIcon} />
          <Text style={styles.boxValue}>{stockMetrics.totalItems}</Text>
          <Text style={styles.boxText}>Total Items</Text>
        </View>
        <View style={styles.box}>
          <AntDesign name="exclamationcircleo" size={24} color={Colours.tertiary_colour} style={styles.boxIcon}/>
          <Text style={styles.boxValue}>{stockMetrics.lowStock}</Text>
          <Text style={styles.boxText}>Low Stock</Text>
        </View>
        <View style={styles.box}>
          <AntDesign name="closecircleo" size={24} color={Colours.tertiary_colour} style={styles.boxIcon} />
          <Text style={styles.boxValue}>{stockMetrics.outOfStock}</Text>
          <Text style={styles.boxText}>Out of Stock</Text>
        </View>
      </View>
      <Text style={styles.title}>Recent Activity</Text>
      <View style={styles.recentActivityBox}>
        {recentActivity.length > 0 ? (
          <FlatList
            data={recentActivity}
            renderItem={renderActivityItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.activityList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <Text style={styles.noActivityText}>No recent activity</Text>
        )}
      </View>

      {/* Onboarding Bottom Sheet */}
      <RBSheet
        ref={onboardingSheetRef}
        height={610}
        closeOnDragDown={false}
        closeOnPressMask={false}
        customStyles={{
          wrapper: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          },
          container: {
            backgroundColor: Colours.bg_colour,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          },
          draggableIcon: {
            backgroundColor: Colours.primary_colour,
          }
        }}
      >
        <View style={styles.onboardingContainer}>
          <Text style={styles.onboardingTitle}>Welcome!</Text>
          <Text style={styles.onboardingSubtitle}>Let's get you started with inventory management</Text>
          
          <View style={styles.onboardingStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Create Your First Hub</Text>
              <Text style={styles.stepDescription}>
                Hubs are like warehouses or main storage areas where you keep your items.
              </Text>
            </View>
          </View>

          <View style={styles.onboardingStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Add Locations</Text>
              <Text style={styles.stepDescription}>
                Locations are specific places within a hub (like shelves or rooms) where items are stored.
              </Text>
            </View>
          </View>

          <View style={styles.onboardingStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Start Adding Items</Text>
              <Text style={styles.stepDescription}>
                Once you have hubs and locations set up, you can begin adding your inventory items.
              </Text>
            </View>
          </View>

          <Text style={styles.onboardingTip}>
            You can manage your hubs and locations anytime from the Profile screen.
          </Text>

          <TouchableOpacity 
            style={styles.onboardingButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              completeOnboarding();
              onboardingSheetRef.current.close();
              router.push('/user-hubs');
            }}
          >
            <Text style={styles.onboardingButtonText}>Go to Hubs Management</Text>
          </TouchableOpacity>
        </View>
      </RBSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.bg_colour,
    padding: 20,
  },
  graphSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colours.primary_colour,
    marginBottom: 10,
    marginLeft: 5,
  },
  graphBox: {
    height: 220,
    backgroundColor: Colours.header_colour,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  graphPlaceholder: {
    color: 'white',
    fontSize: 16,
  },
  recentActivityBox: {
    height: 210,
    backgroundColor: Colours.header_colour,
    borderRadius: 20,
    marginBottom: 20,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  box: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colours.header_colour,
    borderRadius: 20,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 10,
  },
  boxIcon: {
    marginBottom: 10,
    marginLeft: 2,
    marginTop: 3,
  },
  boxValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 5,
  },
  boxText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'left',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colours.primary_colour,
    marginBottom: 10,
    marginLeft: 10,
  },
  activityList: {
    padding: 12,
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  activityItemText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  activityItemDate: {
    color: '#aaa',
    fontSize: 12,
  },
  noActivityText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  // Onboarding styles
  onboardingContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
    textAlign: 'center',
  },
  onboardingSubtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 30,
    textAlign: 'center',
  },
  onboardingStep: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colours.tertiary_colour,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  onboardingTip: {
    fontSize: 14,
    color: Colours.tertiary_colour,
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 30,
    textAlign: 'center',
  },
  onboardingButton: {
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  onboardingButtonText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
});