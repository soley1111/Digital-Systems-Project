import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colours from '../constant/Colours';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>QR Inventory Manager</Text>
        <Text style={styles.subtitle}>Harvie Sole - 21024231</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What is this app?</Text>
        <Text style={styles.sectionText}>
          QR Inventory Manager is a powerful yet easy to use tool that helps you track your inventory 
          using QR codes. Whether you're managing home items, business stock, or collections, 
          this app gives you complete control over your inventory.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Features</Text>
        
        <View style={styles.featureItem}>
          <Feather name="check-circle" size={18} color={Colours.tertiary_colour} />
          <Text style={styles.featureText}>Scan QR codes to quickly edit items</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Feather name="check-circle" size={18} color={Colours.tertiary_colour} />
          <Text style={styles.featureText}>Organise items by hubs and locations</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Feather name="check-circle" size={18} color={Colours.tertiary_colour} />
          <Text style={styles.featureText}>Get low stock alerts before you run out</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Feather name="check-circle" size={18} color={Colours.tertiary_colour} />
          <Text style={styles.featureText}>View inventory trends with 7-day charts</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Feather name="check-circle" size={18} color={Colours.tertiary_colour} />
          <Text style={styles.featureText}>Access your inventory from any device</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Getting Started</Text>
        <Text style={styles.sectionText}>
          1. <Text style={styles.bold}>Create hubs</Text> - These are your main storage areas (like "Home" or "Office")
        </Text>
        <Text style={styles.sectionText}>
          2. <Text style={styles.bold}>Add locations</Text> - Specific places within hubs (like "Garage Shelf" or "Warehouse A")
        </Text>
        <Text style={styles.sectionText}>
          3. <Text style={styles.bold}>Add items</Text> - Enter your inventory with quantities
        </Text>
        <Text style={styles.sectionText}>
          4. <Text style={styles.bold}>Generate QR codes</Text> - Attach to items for quick scanning
        </Text>
        <Text style={styles.sectionText}>
          5. <Text style={styles.bold}>Scan to edit</Text> - Update quantities instantly with your camera
        </Text>
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
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colours.primary_colour,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colours.tertiary_colour,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    color: 'white',
    marginBottom: 8,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: Colours.tertiary_colour,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 15,
    color: 'white',
    marginLeft: 8,
  },
});