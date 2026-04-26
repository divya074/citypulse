import React from "react";
import { View, Text, StyleSheet } from "react-native";

function RuleRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function MerchantRulesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Elmwood Tazza Cafe Rules</Text>

      <View style={styles.card}>
        <RuleRow label="Max Discount" value="20%" />
        <RuleRow
          label="Trigger Condition"
          value="Quiet period (<4 transactions/hour)"
        />
        <RuleRow label="Offer Window" value="07:00 to 14:00" />
        <RuleRow label="Target Radius" value="300 metres" />
        <RuleRow label="Tone" value="Warm and cozy" />
      </View>

      <Text style={styles.footer}>
        AI generates all offer content within these rules.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    padding: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#151C33",
    borderColor: "#232C4D",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  row: {
    borderBottomColor: "#232C4D",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  label: {
    color: "#A8B0C3",
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    color: "#A8B0C3",
    fontSize: 13,
    marginTop: 14,
  },
});
