import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function QrCodeScreen({ route }) {
  const { offer, merchantName } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Screen (next step)</Text>
      <Text style={styles.text}>Merchant: {merchantName || "Unknown"}</Text>
      <Text style={styles.text}>Offer: {offer?.headline || "No headline"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16,
  },
  text: {
    color: "#D7E1FF",
    fontSize: 16,
    marginBottom: 8,
  },
});
