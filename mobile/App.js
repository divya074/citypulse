import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "./src/screens/HomeScreen";
import OfferCardScreen from "./src/screens/OfferCardScreen";
import QrCodeScreen from "./src/screens/QrCodeScreen";
import CashbackScreen from "./src/screens/CashbackScreen";
import MerchantRulesScreen from "./src/screens/MerchantRulesScreen";
import MerchantDashboardScreen from "./src/screens/MerchantDashboardScreen";
import DemoPanelScreen from "./src/screens/DemoPanelScreen";

const RootStack = createNativeStackNavigator();
const ConsumerStack = createNativeStackNavigator();
const MerchantStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ConsumerNavigator() {
  return (
    <ConsumerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1020" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#0B1020" },
      }}
    >
      <ConsumerStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "CityPulse" }}
      />
      <ConsumerStack.Screen
        name="OfferCard"
        component={OfferCardScreen}
        options={{ title: "Your Offer" }}
      />
      <ConsumerStack.Screen
        name="QrCode"
        component={QrCodeScreen}
        options={{ title: "Redeem Offer" }}
      />
      <ConsumerStack.Screen
        name="Cashback"
        component={CashbackScreen}
        options={{ title: "Cashback" }}
      />
      <ConsumerStack.Screen
        name="DemoPanel"
        component={DemoPanelScreen}
        options={{ title: "Demo Panel" }}
      />
    </ConsumerStack.Navigator>
  );
}

function MerchantNavigator() {
  return (
    <MerchantStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1020" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#0B1020" },
      }}
    >
      <MerchantStack.Screen
        name="MerchantRules"
        component={MerchantRulesScreen}
        options={{ title: "Merchant Rules" }}
      />
      <MerchantStack.Screen
        name="MerchantDashboard"
        component={MerchantDashboardScreen}
        options={{ title: "Merchant Dashboard" }}
      />
    </MerchantStack.Navigator>
  );
}

function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#151C33", borderTopColor: "#232C4D" },
        tabBarActiveTintColor: "#5B8CFF",
        tabBarInactiveTintColor: "#A8B0C3",
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = "ellipse";
          if (route.name === "My Wallet") {
            iconName = focused ? "wallet" : "wallet-outline";
          } else if (route.name === "Merchant Portal") {
            iconName = focused ? "storefront" : "storefront-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="My Wallet" component={ConsumerNavigator} />
      <Tab.Screen name="Merchant Portal" component={MerchantNavigator} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName="RootTabs"
        screenOptions={{
          headerShown: false,
        }}
      >
        <RootStack.Screen name="RootTabs" component={RootTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
