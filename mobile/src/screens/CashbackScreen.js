import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function CashbackScreen({ route, navigation }) {
  const { merchantName = "Nearby Merchant", cashback = 0 } = route.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.checkmark}>✅</Text>
        <Text style={styles.title}>Redeemed</Text>
        <Text style={styles.merchant}>{merchantName}</Text>
        <Text style={styles.amount}>${Number(cashback).toFixed(2)} saved</Text>
        <Text style={styles.subtext}>Cashback added to your CityPulse wallet</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#151C33",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232C4D",
    padding: 24,
    alignItems: "center",
  },
  checkmark: {
    fontSize: 54,
    marginBottom: 8,
  },
  title: {
    color: "#00C896",
    fontSize: 32,
    fontWeight: "800",
  },
  merchant: {
    color: "#A8B0C3",
    fontSize: 16,
    marginTop: 6,
  },
  amount: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 14,
  },
  subtext: {
    color: "#A8B0C3",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  button: {
    marginTop: 22,
    width: "100%",
    backgroundColor: "#5B8CFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
