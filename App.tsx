// React
import { useEffect, useState } from "react";
import { TouchableOpacity, View, Text } from "react-native";

// Navigation
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

// Third-party libraries
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { User } from "@supabase/supabase-js";

// Utilities & Providers
import { supabase } from "./utilities/Supabase";
import { ProfileProvider, useProfile } from "./utilities/ProfileProvider";
import { ConversationsProvider } from "./utilities/ConversationsProvider";
import { FriendsProvider, useFriends } from "./utilities/FriendsProvider";
import { AudioSettingsProvider } from "./utilities/AudioSettingsProvider";
import ModalWrapper from "./utilities/ModalWrapper";

// Screens
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import ConversationScreen from "./screens/ConversationScreen";
import FriendRequestsScreen from "./screens/FriendRequestsScreen";

// Types & Styles
import { RootStackParamList, AuthStackParamList } from "./types/navigation";
import { colors } from "./styles/theme";
global.Buffer = require("buffer").Buffer;

// Global error handler
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:global', message: 'Global error caught', data: { errorMessage: error?.message || String(error), errorStack: error?.stack, isFatal: isFatal }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
    // #endregion
    console.error("Global error:", error, "isFatal:", isFatal);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();

export default function App() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:29', message: 'App component rendering', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
  // #endregion
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {


    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoadingUser(false);
      }

    );

    return () => {
      authListener.subscription;
    };
  }, []);

  if (loadingUser) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:54', message: 'App loading user', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
    // #endregion
    return <View />;
  }

  if (user) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:59', message: 'App rendering authenticated stack', data: { hasUser: !!user }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
    // #endregion
    try {
      return (
        <SafeAreaProvider>
          <NavigationContainer>
            <ActionSheetProvider>
              <ProfileProvider>
                <ConversationsProvider>
                  <FriendsProvider>
                    <AudioSettingsProvider>
                      <ModalWrapper>
                        <Navigation />
                      </ModalWrapper>
                    </AudioSettingsProvider>
                  </FriendsProvider>
                </ConversationsProvider>
              </ProfileProvider>
            </ActionSheetProvider>
          </NavigationContainer>
        </SafeAreaProvider>
      );
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:77', message: 'App render error in authenticated stack', data: { errorMessage: error instanceof Error ? error.message : String(error), errorStack: error instanceof Error ? error.stack : undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
      // #endregion
      console.error("Error rendering authenticated stack:", error);
      return <View><Text>Error loading app</Text></View>;
    }
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
                headerTintColor: colors.text,
                headerStyle: {
                  backgroundColor: colors.backgroundSecondary,
                },
              }}
            />
          </AuthStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }
}

const Navigation = () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:101', message: 'Navigation component rendering', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
  // #endregion
  let profile, setViewProfile, friendRequests;
  try {
    const profileContext = useProfile();
    profile = profileContext.profile;
    setViewProfile = profileContext.setViewProfile;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:107', message: 'Navigation useProfile success', data: { hasProfile: !!profile }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:110', message: 'Navigation useProfile error', data: { errorMessage: error instanceof Error ? error.message : String(error), errorStack: error instanceof Error ? error.stack : undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    throw error;
  }
  try {
    const friendsContext = useFriends();
    friendRequests = friendsContext.friendRequests;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:116', message: 'Navigation useFriends success', data: { friendRequestsCount: friendRequests?.length || 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:119', message: 'Navigation useFriends error', data: { errorMessage: error instanceof Error ? error.message : String(error), errorStack: error instanceof Error ? error.stack : undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    throw error;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.backgroundSecondary,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
        },
        headerBackTitleStyle: {
          color: colors.text,
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ route, navigation }) => {
          const incomingCount = (friendRequests || []).filter(
            (req) => req.status === "pending" && req.addresseeId === profile?.uid
          ).length;

          return {
            headerRight: () => (
              <TouchableOpacity
                style={{ left: -25, top: -5 }}
                onPress={() => setViewProfile(true)}
              >
                <Ionicons name="person" size={25} color={colors.text} />
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
          headerBackTitleStyle: { color: colors.text },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="FriendRequests"
        component={FriendRequestsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};
