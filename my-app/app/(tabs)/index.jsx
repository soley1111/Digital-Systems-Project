import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import React, { useContext, useState, useEffect } from 'react';
import Colours from '../../constant/Colours';
import { UserDetailContext } from '../../context/userDetailContext';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';

export default function HomeScreen() {
  const { userDetail } = useContext(UserDetailContext);
  const router = useRouter();
  const [stockMetrics, setStockMetrics] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  // Function to calculate stock metrics
  const calculateStockMetrics = async () => {
    try {
      const itemsRef = collection(db, 'items');
      const q = query(itemsRef, where('owner', '==', auth.currentUser?.email));
      const querySnapshot = await getDocs(q);

      let totalItems = 0;
      let lowStock = 0;
      let outOfStock = 0;
      let allActivity = [];

      querySnapshot.forEach((doc) => {
        const item = doc.data();
        totalItems += item.quantity || 0;
        
        if (item.quantity === 0) {
          outOfStock++;
        } else if (item.quantity <= (item.lowStockThreshold || 5)) {
          lowStock++;
        }

        // Collect edit history if it exists
        if (item.editHistory && item.editHistory.length > 0) {
          item.editHistory.forEach(history => {
            allActivity.push({
              ...history,
              itemId: doc.id,
              itemName: item.name,
              date: history.date.toDate()
            });
          });
        }
      });

      // Sort by date (newest first) and take top 10
      const sortedActivity = allActivity.sort((a, b) => b.date - a.date).slice(0, 20);
      setRecentActivity(sortedActivity);

      setStockMetrics({
        totalItems,
        lowStock,
        outOfStock
      });
    } catch (error) {
      console.error('Error calculating stock metrics:', error);
    }
  };

  // Check if the user has any hubs
  const hasHubs = () => {
    return userDetail?.hubs && Array.isArray(userDetail.hubs) && userDetail.hubs.length > 0;
  };

  useFocusEffect(
    React.useCallback(() => {
      calculateStockMetrics();
    }, [])
  );

  // Initial fetch
  useEffect(() => {
    calculateStockMetrics();
  }, []);

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
      <View style={styles.graphBox}>
        <Text style={styles.graphPlaceholder}>Inventory Trends Graph</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.bg_colour,
    padding: 20,
  },
  graphBox: {
    height: 200,
    backgroundColor: Colours.tertiary_colour,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recentActivityBox: {
    height: 250,
    backgroundColor: Colours.header_colour,
    borderRadius: 20,
    marginBottom: 20,
  },
  graphPlaceholder: {
    color: 'white',
    fontSize: 16,
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
});