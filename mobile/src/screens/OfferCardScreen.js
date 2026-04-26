import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const DEFAULT_OFFER = {
  headline: "Special offer",
  subtext: "Limited-time savings nearby.",
  discount_pct: 10,
  expires_mins: 15,
  color_scheme: "#5B8CFF",
  emoji: "🎉",
  cta: "Claim now",
};

export default function OfferCardScreen({ route, navigation }) {
  const { offer: rawOffer, merchantName, merchantId } = route.params || {};
  const offer = { ...DEFAULT_OFFER, ...(rawOffer || {}) };

  const handleDismiss = () => {
    navigation.goBack();
  };

  const handleAccept = () => {
    navigation.navigate("QrCode", {
      offer,
      merchantName: merchantName || "Nearby Merchant",
      merchantId: merchantId || "m1",
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: offer.color_scheme }]}>
        <Text style={styles.emoji}>{offer.emoji}</Text>
        <Text style={styles.merchant}>{merchantName || "Nearby Merchant"}</Text>

        <Text style={styles.headline}>{offer.headline}</Text>
        <Text style={styles.subtext}>{offer.subtext}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.discount}>{offer.discount_pct}% OFF</Text>
          <Text style={styles.expiry}>Expires in {offer.expires_mins} min</Text>
        </View>

        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: offer.color_scheme }]}
          onPress={handleAccept}
        >
          <Text style={styles.acceptButtonText}>{offer.cta}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
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
  card: {
    backgroundColor: "#151C33",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  merchant: {
    color: "#A8B0C3",
    fontSize: 14,
    marginBottom: 12,
  },
  headline: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    marginBottom: 10,
  },
  subtext: {
    color: "#D7E1FF",
    fontSize: 16,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  discount: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  expiry: {
    color: "#A8B0C3",
    fontSize: 14,
  },
  acceptButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  dismissButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#2A365F",
  },
  dismissButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
