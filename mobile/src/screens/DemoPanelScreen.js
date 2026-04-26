import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Location from "expo-location";

const WEATHER_OPTIONS = ["sunny", "cloudy", "rain", "snow", "cold"];
const DEMAND_OPTIONS = ["quiet", "busy"];

export default function DemoPanelScreen({ navigation }) {
  const baseUrl = useMemo(() => "http://192.168.1.85:3001", []);
  const [weather, setWeather] = useState("sunny");
  const [demandLevel, setDemandLevel] = useState("quiet");
  const [merchants, setMerchants] = useState([]);
  const [merchantId, setMerchantId] = useState("cafe_muller");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadMerchants = async () => {
      try {
        const res = await fetch(`${baseUrl}/merchants`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMerchants(data);
          setMerchantId(data[0].id);
        }
      } catch {
        setMerchants([]);
      }
    };
    loadMerchants();
  }, [baseUrl]);

  const selectedMerchant =
    merchants.find((m) => m.id === merchantId) || merchants[0] || null;

  const getLiveCoords = async () => {
    const FALLBACK_COORDS = { lat: 42.8864, lon: -78.8784 };
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return FALLBACK_COORDS;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
    } catch {
      return FALLBACK_COORDS;
    }
  };

  const generateDemoOffer = async () => {
    try {
      setLoading(true);
      const { lat, lon } = await getLiveCoords();
      const res = await fetch(`${baseUrl}/generate-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchantId || "cafe_muller",
          userLat: lat,
          userLon: lon,
          overrides: {
            weather,
            demand_level: demandLevel,
            merchant_name: selectedMerchant?.name || "Nearby Merchant",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) return;

      navigation.navigate("OfferCard", {
        offer: data,
        merchantName: selectedMerchant?.name || "Nearby Merchant",
        merchantId: merchantId || "cafe_muller",
        baseUrl,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Demo Control Panel</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Weather Override</Text>
        <View style={styles.chips}>
          {WEATHER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, weather === opt && styles.chipActive]}
              onPress={() => setWeather(opt)}
            >
              <Text style={styles.chipText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Demand Override</Text>
        <View style={styles.chips}>
          {DEMAND_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, demandLevel === opt && styles.chipActive]}
              onPress={() => setDemandLevel(opt)}
            >
              <Text style={styles.chipText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Merchant Selector</Text>
        <View style={styles.chips}>
          {merchants.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.chip, merchantId === m.id && styles.chipActive]}
              onPress={() => setMerchantId(m.id)}
            >
              <Text style={styles.chipText}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={generateDemoOffer}
        disabled={loading}
      >
        <Text style={styles.generateButtonText}>
          {loading ? "Generating..." : "Generate Offer"}
        </Text>
      </TouchableOpacity>
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
    marginTop: 8,
    marginBottom: 14,
  },
  card: {
    backgroundColor: "#151C33",
    borderColor: "#232C4D",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    color: "#A8B0C3",
    fontSize: 13,
    marginBottom: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderColor: "#232C4D",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#0B1020",
  },
  chipActive: {
    backgroundColor: "#5B8CFF",
    borderColor: "#5B8CFF",
  },
  chipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  generateButton: {
    marginTop: 8,
    backgroundColor: "#5B8CFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
