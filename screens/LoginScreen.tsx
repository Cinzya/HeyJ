import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import OAuthButton from "../components/auth/OAuthButton";
import { signInWithEmail } from "../utilities/AuthHelper";
import { styles } from "../styles/LoginScreen.styles";

const LoginScreen = ({ navigation }: { navigation?: any }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      console.log('🎯 LoginScreen: Starting signin...');
      await signInWithEmail(email, password);
      console.log('🎯 LoginScreen: Signin completed');
      // Keep loading true - auth state change will handle navigation
    } catch (error: any) {
      console.error('🎯 LoginScreen: Auth error:', error);
      Alert.alert("Error", error.message || "Authentication failed");
      setLoading(false);
      return;
    }
    
    // If we get here with loading still true, we're waiting for auth state change
    console.log('🎯 LoginScreen: Waiting for auth state change...');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to HeyJ</Text>
          <Text style={styles.subtitle}>Voice messaging made simple</Text>

          {/* Email/Password Section */}
          <View style={styles.emailSection}>
            <Text style={styles.sectionTitle}>Sign In</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />

            <TouchableOpacity
              style={[styles.emailButton, loading && styles.emailButtonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.emailButtonText}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => navigation?.navigate?.("Signup")}
            >
              <Text style={styles.toggleButtonText}>
                Don't have an account? Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* OAuth Section */}
          <View style={styles.oauthSection}>
            <Text style={styles.divider}>OR</Text>
            <Text style={styles.sectionTitle}>Continue with</Text>
            <View style={styles.oauthButtons}>
              <OAuthButton type="google" />
              <OAuthButton type="apple" />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
