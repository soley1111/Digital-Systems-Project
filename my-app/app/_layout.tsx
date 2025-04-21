import { Stack } from "expo-router";
import { UserDetailContext } from "../context/userDetailContext";
import React, { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const [userDetail, setUserDetail] = useState();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(login)" />
          <Stack.Screen name="editHubModal" options= {{
            presentation: "modal",
            headerShown: false,
          }}  
          />
          <Stack.Screen name="itemModal" options= {{
            presentation: "modal",
            headerShown: false,
          }}  
          />
          <Stack.Screen name="categoryModal" options= {{
          presentation: "modal",
          headerShown: false,
          }}
          />
        </Stack>
      </UserDetailContext.Provider>
    </GestureHandlerRootView>
  );
}

// npx expo start --tunnel