import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
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
  const [isScanningArea, setIsScanningArea] = useState(false);
  const [lastAutoOfferKey, setLastAutoOfferKey] = useState("");
  const [titleTapCount, setTitleTapCount] = useState(0);
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [userCoords, setUserCoords] = useState({
    lat: null,
    lon: null,
  });

  const [context, setContext] = useState({
    weather: "-",
    timeSlot: "-",
    nearestMerchant: "-",
    demandLevel: "-",
    nearestPoi: "No POI",
    activeEvent: "No events today",
    merchantId: "cafe_muller",
  });

  const getBestEffortLocation = async () => {
    const FALLBACK_COORDS = { lat: 42.8864, lon: -78.8784 };

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return FALLBACK_COORDS;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setUserCoords({ lat, lon });
      return { lat, lon };
    } catch {
      return FALLBACK_COORDS;
    }
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
        data?.nearestMerchant?.name ||
        data?.nearest_merchant?.name ||
        data?.intent_signal?.context ||
        "Nearby merchant";
      const nearestPoiName = data?.nearest_poi?.name || "No POI";
      const nearestPoiDistance = data?.nearest_poi?.distance_metres;
      const miles =
        Number.isFinite(nearestPoiDistance) ? nearestPoiDistance * 0.000621371 : null;
      const nearestPoi = Number.isFinite(nearestPoiDistance)
        ? `${nearestPoiName} (${miles.toFixed(2)} mi)`
        : nearestPoiName;
      const activeEvent =
        data?.active_events?.[0]?.name || "No events today";
      const demandLevel =
        data?.payone?.status ||
        data?.demand_level ||
        data?.demandLevel ||
        "unknown";
      const merchantId =
        data?.nearestMerchant?.id ||
        data?.nearest_merchant?.id ||
        "elmwood_cafe";

      setContext({
        weather,
        timeSlot,
        nearestMerchant,
        nearestPoi,
        activeEvent,
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
        baseUrl,
      });
    } catch (err) {
      Alert.alert("Offer error", err.message);
    } finally {
      setOfferLoading(false);
    }
  };

  useEffect(() => {
    if (contextLoading || offerLoading) return;
    if ((context.demandLevel || "").toLowerCase() !== "quiet") return;

    const autoOfferKey = `${context.merchantId}-${context.timeSlot}-${context.demandLevel}`;
    if (lastAutoOfferKey === autoOfferKey) return;

    setIsScanningArea(true);
    const timer = setTimeout(async () => {
      setIsScanningArea(false);
      setLastAutoOfferKey(autoOfferKey);
      await generateOffer();
    }, 2000);

    return () => {
      clearTimeout(timer);
      setIsScanningArea(false);
    };
  }, [
    contextLoading,
    offerLoading,
    context.demandLevel,
    context.merchantId,
    context.timeSlot,
    lastAutoOfferKey,
  ]);

  useEffect(() => {
    if (titleTapCount === 0) return;
    const timeout = setTimeout(() => setTitleTapCount(0), 1200);
    return () => clearTimeout(timeout);
  }, [titleTapCount]);

  const handleTitleTap = () => {
    setTitleTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        navigation.navigate("DemoPanel");
        return 0;
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleTitleTap}>
          <Text style={styles.title}>CityPulse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => setShowGdprModal(true)}
        >
          <Text style={styles.infoButtonText}>i</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Real-time context wallet</Text>

      <View style={styles.card}>
        <Row label="Weather" value={context.weather} />
        <Row label="Time Slot" value={context.timeSlot} />
        <Row label="Nearest Merchant" value={context.nearestMerchant} />
        <Row label="Nearest POI" value={context.nearestPoi} />
        <Row label="Active Event" value={context.activeEvent} />
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

      {(isScanningArea || offerLoading) && (
        <View style={styles.scanningContainer}>
          <ActivityIndicator color="#5B8CFF" />
          <Text style={styles.scanningText}>Scanning your area...</Text>
        </View>
      )}

      <Modal
        visible={showGdprModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGdprModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>GDPR & Privacy</Text>
            <Text style={styles.modalText}>
              1. Raw GPS and movement data stays on your device and is never sent to any server.
            </Text>
            <Text style={styles.modalText}>
              2. Your device runs a local function called mapToIntent that converts raw
              signals into an abstract intent like warm drink high urgency.
            </Text>
            <Text style={styles.modalText}>
              3. Only that abstract intent string is sent to the server. No personal data
              ever reaches the cloud.
            </Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowGdprModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#232C4D",
    backgroundColor: "#151C33",
  },
  infoButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
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
  scanningContainer: {
    marginTop: 8,
    backgroundColor: "#151C33",
    borderWidth: 1,
    borderColor: "#232C4D",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  scanningText: {
    color: "#A8B0C3",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#151C33",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232C4D",
    padding: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
  },
  modalText: {
    color: "#A8B0C3",
    fontSize: 14,
    marginBottom: 8,
  },
  modalClose: {
    marginTop: 8,
    backgroundColor: "#5B8CFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
});
