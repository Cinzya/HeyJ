// React
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

// Components (for future OAuth implementation - currently commented out at line 121)
import OAuthButton from "../components/auth/OAuthButton";

// Utilities
import { signInWithEmail } from "../utilities/AuthHelper";

// Types & Styles
import { LoginScreenProps } from "../types/navigation";
import { styles } from "../styles/screens/LoginScreen.styles";


const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      style={[styles.container, { minHeight: '100%' }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { minHeight: '100%' }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, { minHeight: '100%' }]}>
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


            <View style={{ position: 'relative' }}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 10, top: 12 }}
                onPress={() => setShowPassword((prev) => !prev)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Text style={{ color: '#007AFF', fontSize: 14 }}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

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

          {/* OAuth Section - commented out until social logins are setup */}
          {false && (
            <View style={styles.oauthSection}>
              <Text style={styles.divider}>OR</Text>
              <Text style={styles.sectionTitle}>Continue with</Text>
              <View style={styles.oauthButtons}>
                <OAuthButton type="google" />
                <OAuthButton type="apple" />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
