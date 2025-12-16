import { StyleSheet, TouchableOpacity, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import OAuthButton from "./components/auth/OAuthButton";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./utilities/Supabase";
// @ts-expect-error
import { Ionicons } from "react-native-vector-icons";
import { ProfileProvider, useProfile } from "./utilities/ProfileProvider";
import { AudioSettingsProvider } from "./utilities/AudioSettingsProvider";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import ConversationScreen from "./screens/ConversationScreen";
import ModalWrapper from "./utilities/ModalWrapper";
global.Buffer = require("buffer").Buffer;

const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

export default function App() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.refreshSession();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoadingUser(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription;
    };
  }, []);

  if (loadingUser) {
    return <View />;
  }

  if (user) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <ActionSheetProvider>
            <ProfileProvider>
              <AudioSettingsProvider>
                <ModalWrapper>
                  <Navigation />
                </ModalWrapper>
              </AudioSettingsProvider>
            </ProfileProvider>
          </ActionSheetProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  } else {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen 
              name="Signup" 
              component={SignupScreen}
              options={{
                headerShown: true,
                headerTitle: "",
                headerBackTitleVisible: false,
                headerTintColor: "#000",
              }}
            />
          </AuthStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }
}

const Navigation = () => {
  const { setViewProfile } = useProfile();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ route, navigation }: { route: any; navigation: any }) => {
          return {
            headerLeft: () => (
              <TouchableOpacity
                style={{ left: 15 }}
                onPress={() => setViewProfile(true)}
              >
                <Ionicons name="person" size={25} />
              </TouchableOpacity>
            ),
            headerTitleAlign: "center",
          };
        }}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{
          headerBackTitleStyle: styles.backButton,
          headerTintColor: "#000",
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    color: "#000",
  },
});
