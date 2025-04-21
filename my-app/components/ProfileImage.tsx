import React from "react";
import { StyleSheet, View, Text } from "react-native";
import Colours from "../constant/Colours"; // Adjust the path as necessary

const ProfileImage = ({ name }) => {
  const firstInitial = name ? name[0].toUpperCase() : ""; // Get only the first letter of the name

  return (
    <View style={styles.userProfileImage}>
      <Text style={styles.initialText}>{firstInitial}</Text>
    </View>
  );
};
export default ProfileImage;

const styles = StyleSheet.create({
  userProfileImage: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    height: 60,
    backgroundColor: Colours.tertiary_colour,
    color: "#ffffff",
    fontSize: 25,
    borderRadius: 30,
    fontWeight: "800",
  },
  initialText: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "800",
  },
});