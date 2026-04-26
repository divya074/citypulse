import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import * as Location from "expo-location";

function getBackendBaseUrl() {
  // Fallback for physical devices on LAN.
  // const LOCAL_IP = "192.168.1.85";
  // const hostFromExpo =
  //   Constants.expoConfig?.hostUri?.split(":")?.[0] ||
  //   Constants.manifest2?.extra?.expoClient?.hostUri?.split(":")?.[0];

  // if (hostFromExpo) {
  //   return `http://${hostFromExpo}:3001`;
  // }
  // if (Platform.OS === "android") {
  //   return "http://10.0.2.2:3001";
  // }
  // if (Platform.OS === "ios") {
  //   return "http://localhost:3001";
  // }
  // return `http://${LOCAL_IP}:3001`;
  const LOCAL_IP = "192.168.1.85"; // your laptop IP from ipconfig getifaddr en0
  return `http://${LOCAL_IP}:3001`;
}

export default function HomeScreen({ navigation }) {
  const baseUrl = useMemo(() => getBackendBaseUrl(), []);

  const [contextLoading, setContextLoading] = useState(false);
  const [offerLoading, setOfferLoading] = useState(false);
  const [userCoords, setUserCoords] = useState({
    lat: 48.7758,
    lon: 9.1829,
  });

  const [context, setContext] = useState({
    weather: "-",
    timeSlot: "-",
    nearestMerchant: "-",
    demandLevel: "-",
    merchantId: "cafe_muller",
  });

  const getBestEffortLocation = async () => {
    let lat = userCoords.lat;
    let lon = userCoords.lon;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        setUserCoords({ lat, lon });
      }
    } catch {
      // Keep last known coords if GPS is unavailable
    }

    return { lat, lon };
  };

  const fetchContext = async () => {
    try {
      setContextLoading(true);
      const { lat, lon } = await getBestEffortLocation();

      const res = await fetch(
        `${baseUrl}/aggregate-context?lat=${lat}&lon=${lon}`
      );
      if (!res.ok) throw new Error("Failed to fetch context");

      const data = await res.json();

      // Defensive mapping so UI does not crash if shape changes
      const weather = data?.weather?.condition || data?.weather?.main || "Unknown";
      const timeSlot = data?.time_slot || data?.timeSlot || "Now";
      const nearestMerchant =
        data?.nearest_merchant?.name ||
        data?.nearestMerchant?.name ||
        data?.intent_signal?.context ||
        "Nearby merchant";
      const demandLevel =
        data?.payone?.status ||
        data?.demand_level ||
        data?.demandLevel ||
        "unknown";
      const merchantId =
        data?.nearest_merchant?.id ||
        data?.nearestMerchant?.id ||
        "cafe_muller";

      setContext({
        weather,
        timeSlot,
        nearestMerchant,
        demandLevel,
        merchantId,
      });
    } catch (err) {
      Alert.alert("Context error", err.message);
    } finally {
      setContextLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]);

  const generateOffer = async () => {
    try {
      setOfferLoading(true);
      const { lat, lon } = await getBestEffortLocation();

      const body = {
        merchantId: context.merchantId || "cafe_muller",
        userLat: lat,
        userLon: lon,
      };

      const res = await fetch(`${baseUrl}/generate-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Offer generation failed (${res.status})`);
      }

      const offer = await res.json();

      navigation.navigate("OfferCard", {
        offer,
        merchantName: context.nearestMerchant,
        merchantId: context.merchantId,
      });
    } catch (err) {
      Alert.alert("Offer error", err.message);
    } finally {
      setOfferLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CityPulse</Text>
      <Text style={styles.subtitle}>Real-time context wallet</Text>

      <View style={styles.card}>
        <Row label="Weather" value={context.weather} />
        <Row label="Time Slot" value={context.timeSlot} />
        <Row label="Nearest Merchant" value={context.nearestMerchant} />
        <Row label="Demand Level" value={context.demandLevel} />
      </View>

      <TouchableOpacity
        style={[styles.button, contextLoading && styles.buttonDisabled]}
        onPress={fetchContext}
        disabled={contextLoading}
      >
        {contextLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Refresh Live Context</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.primaryButton,
          offerLoading && styles.buttonDisabled,
        ]}
        onPress={generateOffer}
        disabled={offerLoading}
      >
        {offerLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Generate Offer</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    color: "#A8B0C3",
    marginTop: 6,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#151C33",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#232C4D",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#232C4D",
  },
  label: {
    color: "#A8B0C3",
    fontSize: 14,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  button: {
    backgroundColor: "#2A365F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#5B8CFF",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
