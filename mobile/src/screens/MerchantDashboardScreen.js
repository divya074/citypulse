import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

const PLACEHOLDER = {
  offers_sent: 42,
  offers_redeemed: 18,
  accept_rate: 42.9,
  avg_discount: 14.3,
  best_headline: "Quiet now? Warm latte deal nearby",
};

function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function MerchantDashboardScreen() {
  const baseUrl = useMemo(() => "http://192.168.1.85:3001", []);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(PLACEHOLDER);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${baseUrl}/dashboard/elmwood_cafe`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Dashboard failed");

        const merged = {
          ...PLACEHOLDER,
          ...data,
        };
        if (!merged.offers_sent) {
          setStats(PLACEHOLDER);
        } else {
          setStats(merged);
        }
      } catch {
        setStats(PLACEHOLDER);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [baseUrl]);

  const recentOffers = [
    {
      headline: stats.best_headline,
      status: "Redeemed",
    },
    {
      headline: "Lunch break special nearby",
      status: "Accepted",
    },
    {
      headline: "Cloudy day comfort combo",
      status: "Sent",
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Merchant Dashboard</Text>

      {loading ? (
        <ActivityIndicator color="#5B8CFF" />
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatBox label="Offers Sent" value={stats.offers_sent} />
            <StatBox label="Redeemed" value={stats.offers_redeemed} />
            <StatBox label="Accept Rate" value={`${stats.accept_rate}%`} />
            <StatBox label="Avg Discount" value={`${stats.avg_discount}%`} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recent Offers</Text>
            {recentOffers.map((item, idx) => (
              <View key={idx} style={styles.offerRow}>
                <Text style={styles.offerHeadline}>{item.headline}</Text>
                <Text style={styles.offerStatus}>{item.status}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Best Performing Headline</Text>
            <Text style={styles.bestHeadline}>{stats.best_headline}</Text>
          </View>
        </>
      )}
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
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#151C33",
    borderColor: "#232C4D",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  statLabel: {
    color: "#A8B0C3",
    fontSize: 12,
    marginBottom: 5,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#151C33",
    borderColor: "#232C4D",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  offerRow: {
    paddingVertical: 8,
    borderBottomColor: "#232C4D",
    borderBottomWidth: 1,
  },
  offerHeadline: {
    color: "#D7E1FF",
    fontSize: 14,
    marginBottom: 3,
  },
  offerStatus: {
    color: "#A8B0C3",
    fontSize: 12,
  },
  bestHeadline: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
