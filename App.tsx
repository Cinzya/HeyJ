import { TouchableOpacity, View, Text } from "react-native";
import { styles } from "./styles/App.styles";
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
import { ConversationsProvider } from "./utilities/ConversationsProvider";
import { FriendsProvider, useFriends } from "./utilities/FriendsProvider";
import { AudioSettingsProvider } from "./utilities/AudioSettingsProvider";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import ConversationScreen from "./screens/ConversationScreen";
import FriendRequestsScreen from "./screens/FriendRequestsScreen";
import ModalWrapper from "./utilities/ModalWrapper";
import { RootStackParamList, AuthStackParamList } from "./types/navigation";
global.Buffer = require("buffer").Buffer;

// Global error handler
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:global',message:'Global error caught',data:{errorMessage:error?.message||String(error),errorStack:error?.stack,isFatal:isFatal},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
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
  fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:29',message:'App component rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:35',message:'App useEffect - getting session',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    supabase.auth.refreshSession();
    supabase.auth.getSession().then(({ data: { session } }) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:38',message:'App session received',data:{hasUser:!!session?.user,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      setUser(session?.user ?? null);
      setLoadingUser(false);
    }).catch((error) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:42',message:'App session error',data:{errorMessage:error?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error("Error getting session:", error);
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:54',message:'App loading user',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return <View />;
  }

  if (user) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:59',message:'App rendering authenticated stack',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
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
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:77',message:'App render error in authenticated stack',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:101',message:'Navigation component rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  let profile, setViewProfile, friendRequests;
  try {
    const profileContext = useProfile();
    profile = profileContext.profile;
    setViewProfile = profileContext.setViewProfile;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:107',message:'Navigation useProfile success',data:{hasProfile:!!profile},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:110',message:'Navigation useProfile error',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw error;
  }
  try {
    const friendsContext = useFriends();
    friendRequests = friendsContext.friendRequests;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:116',message:'Navigation useFriends success',data:{friendRequestsCount:friendRequests?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:119',message:'Navigation useFriends error',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw error;
  }

  return (
    <Stack.Navigator>
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
          headerBackTitleStyle: { color: "#000" },
          headerTintColor: "#000",
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
