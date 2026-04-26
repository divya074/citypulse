import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./src/screens/HomeScreen";
import OfferCardScreen from "./src/screens/OfferCardScreen";
import QrCodeScreen from "./src/screens/QrCodeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: "#0B1020" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#0B1020" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "CityPulse" }}
        />
        <Stack.Screen
          name="OfferCard"
          component={OfferCardScreen}
          options={{ title: "Your Offer" }}
        />
        <Stack.Screen
          name="QrCode"
          component={QrCodeScreen}
          options={{ title: "Redeem Offer" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
