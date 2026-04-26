import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function QrCodeScreen({ route, navigation }) {
  const baseUrl = useMemo(
    () => route.params?.baseUrl || "http://192.168.1.85:3001",
    [route.params?.baseUrl]
  );
  const { offer, merchantName, merchantId } = route.params || {};
  const discountPct = Number(offer?.discount_pct) || 0;
  const initialMinutes = Number(offer?.expires_mins) || 15;

  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(true);
  const [validating, setValidating] = useState(false);
  const [expired, setExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [tokenError, setTokenError] = useState("");

  useEffect(() => {
    const createRedeemToken = async () => {
      try {
        setLoadingToken(true);
        const res = await fetch(`${baseUrl}/redeem`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantId: merchantId || "elmwood_cafe",
            discount_pct: discountPct,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setTokenError(data?.error || "Failed to create token");
          setToken("");
          return;
        }
        setTokenError("");
        setToken(data?.token || "");
      } catch (error) {
        setTokenError(error?.message || "Failed to create token");
        setToken("");
      } finally {
        setLoadingToken(false);
      }
    };

    createRedeemToken();
  }, [baseUrl, merchantId, discountPct]);

  useEffect(() => {
    if (expired || loadingToken) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expired, loadingToken]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const handleSimulateScan = async () => {
    if (!token || expired) return;
    try {
      setValidating(true);
      const res = await fetch(`${baseUrl}/validate/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.status === "expired") setExpired(true);
        return;
      }
      navigation.replace("Cashback", {
        merchantName: merchantName || "Nearby Merchant",
        cashback: data?.cashback || 0,
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.merchant}>{merchantName || "Nearby Merchant"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{discountPct}% OFF</Text>
        </View>

        <View style={[styles.qrBox, expired && styles.qrBoxExpired]}>
          {loadingToken ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : token ? (
            <QRCode value={token} size={220} />
          ) : (
            <Text style={styles.text}>
              {tokenError ? `Token unavailable: ${tokenError}` : "Token unavailable"}
            </Text>
          )}
        </View>

        {expired ? (
          <Text style={styles.expired}>Offer Expired</Text>
        ) : (
          <Text style={styles.timer}>{mm}:{ss}</Text>
        )}
        <Text style={styles.text}>Show this to the cashier.</Text>

        {expired ? (
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.buttonText}>Back Home</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleSimulateScan}
            disabled={validating || loadingToken || !token}
          >
            <Text style={styles.buttonText}>
              {validating ? "Validating..." : "Simulate Scan"}
            </Text>
          </TouchableOpacity>
        )}
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232C4D",
    padding: 20,
    alignItems: "center",
  },
  merchant: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  badge: {
    backgroundColor: "#5B8CFF",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  qrBox: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
  },
  qrBoxExpired: {
    opacity: 0.35,
  },
  timer: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 16,
  },
  expired: {
    color: "#FF6B6B",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
  },
  text: {
    color: "#D7E1FF",
    fontSize: 16,
    marginTop: 10,
  },
  scanButton: {
    marginTop: 18,
    width: "100%",
    backgroundColor: "#5B8CFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  homeButton: {
    marginTop: 18,
    width: "100%",
    backgroundColor: "#2A365F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
