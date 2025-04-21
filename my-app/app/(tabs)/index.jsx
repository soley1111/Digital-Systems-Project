import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useContext } from 'react';
import Colours from '../../constant/Colours';
import { UserDetailContext } from '../../context/userDetailContext';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';


export default function HomeScreen() {
  const { userDetail } = useContext(UserDetailContext);
  const router = useRouter();


  // Check if the user has any hubs
  const hasHubs = () => {
    return userDetail?.hubs && Array.isArray(userDetail.hubs) && userDetail.hubs.length > 0;
  };

  return (
    <View style={styles.container}>
   
      <View style={styles.graphBox}>
        <Text style={styles.graphPlaceholder}>Inventory Trends Graph</Text>
      </View>

      
      <View style={styles.boxesRow}>
      <View style={styles.box}>
        <AntDesign name="linechart" size={24} color={Colours.tertiary_colour} style={styles.boxIcon} />
        <Text style={styles.boxValue}>128</Text>
        <Text style={styles.boxText}>Total Items</Text>
      </View>
      <View style={styles.box}>
        <AntDesign name="exclamationcircleo" size={24} color={Colours.tertiary_colour} style={styles.boxIcon}/>
        <Text style={styles.boxValue}>5</Text>
        <Text style={styles.boxText}>Low Stock</Text>
      </View>
      <View style={styles.box}>
        <AntDesign name="closecircleo" size={24} color={Colours.tertiary_colour} style={styles.boxIcon} />
        <Text style={styles.boxValue}>2</Text>
        <Text style={styles.boxText}>Out of Stock</Text>
      </View>
      </View>
      <Text style={styles.title}>Recent Activity</Text>
      <View style={styles.recentActivityBox}>
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
    justifyContent: 'center',
    alignItems: 'center',
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
});