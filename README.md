# QR Inventory Manager with Predictive Forecasting

A React Native inventory management application with QR code scanning and predictive analytics capabilities.

## Table of Contents
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Usage](#usage)
- [Architecture](#architecture)

## Features

### Inventory Management & Analytics
- **Hub & Location Hierarchy**: Organise items in a hub > location structure with color-coding
- **Real-time Tracking**: Monitor stock levels with quantity adjustments and edit history
- **Dashboard Analytics**: View inventory trends with 7-day stock level charts and metrics
- **Low Stock Alerts**: Automatic notifications when items reach minimum thresholds

### QR Code Integration
- **QR Generation**: Create unique QR codes for each inventory item
- **Instant Lookup**: Scan QR codes to quickly access and edit item details
- **Validation**: System validates scanned QR codes to prevent errors

### Predictive Forecasting Alerts
- **Usage Analysis**: Tracks consumption patterns using forecasting models like Linear regression
- **Smart Notifications**: Predicts when items will run out based on historical usage
- **Confidence Scoring**: Rates forecast accuracy based on data quality and consistency

## Technical Stack

- **Frontend**: React Native with TypeScript
- **Navigation**: Expo Router and React Navigation
- **State Management**: React Context API
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **UI Components**: 
  - React Native Raw Bottom Sheet
  - React Native Chart Kit
  - Expo Vector Icons
- **Haptics**: Expo Haptics for tactile feedback

## Usage

1. **Set Up Your Inventory Structure**:
   - Create hubs (e.g., "Warehouse", "Home")
   - Add locations within each hub (e.g., "Row 1", "Room 1")

2. **Add Inventory Items**:
   - Specify name, quantity, and location
   - Set minimum stock thresholds
   - Assign categories for organisation

3. **Generate QR Codes**:
   - Each item automatically gets a unique QR code
   - Print and attach to physical items

4. **Scan Items**:
   - Use the scanner to quickly pull up item details
   - Adjust quantities on the go

5. **Monitor Alerts**:
   - View predictive notifications in the Alerts tab
   - Get warnings before items run out or have run out

## Architecture

Key architectural features:
- TypeScript interfaces for all data models
- Firebase real-time synchronization
- Optimised FlatList rendering for large inventories
- Haptic feedback for important interactions

Harvie Sole - 21024231
