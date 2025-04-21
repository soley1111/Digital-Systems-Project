import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import Colours from '../../constant/Colours';

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text>Scan Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.bg_colour,
  },
});