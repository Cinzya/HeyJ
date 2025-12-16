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
  Image,
} from "react-native";
import { styles } from "../styles/SignupScreen.styles";
// @ts-expect-error
import { AntDesign, Ionicons } from "react-native-vector-icons";
import {
  ImagePickerAsset,
  MediaType,
  requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
} from "expo-image-picker";
import { openSettings } from "expo-linking";
import { signUpWithEmail } from "../utilities/AuthHelper";
import { supabase } from "../utilities/Supabase";
import { useFormValidation } from "../hooks/useFormValidation";
import { SignupScreenProps } from "../types/navigation";

const SignupScreen = ({ navigation }: SignupScreenProps) => {
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<ImagePickerAsset | null>(null);

  const defaultProfileImage = "https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=";

  const {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordStrength,
    passwordsMatch,
  } = useFormValidation();

  const getProfilePic = async () => {
    console.log("📸 Profile picture button pressed");

    try {
      console.log("📸 Requesting media library permissions...");
      const { status } = await requestMediaLibraryPermissionsAsync();
      console.log("📸 Permission status:", status);

      if (status === "granted") {
        console.log("📸 Opening image picker...");
        const result = await launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: false,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          selectionLimit: 1,
        });

        console.log("📸 Image picker result:", result.canceled ? "canceled" : "selected");

        if (result.canceled) {
          return;
        }

        if (!result.canceled && result.assets[0].uri !== null) {
          console.log("📸 Image selected:", result.assets[0].uri);
          setProfileImage(result.assets[0]);
        }
      } else if (status === "undetermined") {
        console.log("📸 Permission undetermined, requesting again...");
        getProfilePic();
      } else {
        console.log("📸 Permission denied, showing alert");
        Alert.alert(
          "Permission Required",
          "Please open settings and grant photo library access.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error("📸 Error getting profile picture:", error);
      Alert.alert("Error", "Failed to open image picker. Please try again.");
    }
  };

  const uploadProfilePic = async (userId: string): Promise<string | null> => {
    if (!profileImage) return null;

    try {
      const fileName = `profile_${userId}_${new Date().getTime()}.png`;
      const response = await fetch(profileImage.uri);
      const buffer = await response.arrayBuffer();

      const { data, error } = await supabase.storage
        .from("profile_images")
        .upload(fileName, buffer, { contentType: "image/png" });

      if (error) {
        console.error("Error uploading profile image:", error.message);
        return null;
      }

      if (data) {
        const publicUrl = supabase.storage
          .from("profile_images")
          .getPublicUrl(fileName).data.publicUrl;
        return publicUrl;
      }
    } catch (error) {
      console.error("Error uploading profile image:", error);
    }
    return null;
  };

  const handleSignup = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter a password");
      return;
    }
    if (passwordStrength.score < 2) {
      Alert.alert(
        "Weak Password",
        "Please create a stronger password. Your password should be at least 12 characters and include uppercase, lowercase, numbers, and special characters."
      );
      return;
    }
    if (!passwordsMatch) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      console.log("🎯 SignupScreen: Starting signup...");

      // Create the user account with name metadata for the trigger
      const result = await signUpWithEmail(email, password, {
        name: fullName.trim(),
        profilePicture: defaultProfileImage,
      });

      if (!result.user) {
        throw new Error("Failed to create user account");
      }

      console.log("🎯 SignupScreen: User created, creating profile...");

      // Upload profile picture if provided
      let profilePictureUrl = defaultProfileImage;
      if (profileImage) {
        console.log("🎯 SignupScreen: Uploading custom profile picture...");
        const uploadedUrl = await uploadProfilePic(result.user.id);
        if (uploadedUrl) {
          profilePictureUrl = uploadedUrl;
        }
      }

      // Generate userCode for the new profile
      const userCode = `${fullName.trim().replace(/\s+/g, '')}@${Math.floor(Math.random() * 9999)}`;

      // Create the profile manually (in case trigger doesn't exist or fails)
      console.log("🎯 SignupScreen: Inserting profile into database...");
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          uid: result.user.id,
          email: email,
          name: fullName.trim(),
          profilePicture: profilePictureUrl,
          conversations: [],
          userCode: userCode,
        });

      if (profileError) {
        // Check if it's a duplicate key error (trigger already created it)
        if (profileError.code === '23505') {
          console.log("🎯 SignupScreen: Profile already exists (created by trigger)");

          // If we have a custom image or need to set userCode, update the profile
          const updateData: any = {};
          if (profileImage && profilePictureUrl !== defaultProfileImage) {
            updateData.profilePicture = profilePictureUrl;
          }
          // Generate userCode if it doesn't exist (in case trigger created profile without it)
          const userCode = `${fullName.trim().replace(/\s+/g, '')}@${Math.floor(Math.random() * 9999)}`;
          updateData.userCode = userCode;

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from("profiles")
              .update(updateData)
              .eq("uid", result.user.id);

            if (updateError) {
              console.error("Error updating profile:", updateError);
            }
          }
        } else {
          console.error("Error creating profile:", profileError);
          throw new Error("Failed to create user profile");
        }
      } else {
        console.log("🎯 SignupScreen: Profile created successfully");
      }

      console.log("🎯 SignupScreen: Signup complete!");

      // Check if email confirmation is required
      if (result.user && !result.session) {
        Alert.alert(
          "Check Your Email",
          "We've sent a confirmation email. Please check your inbox and click the link to activate your account.",
          [
            {
              text: "OK",
              onPress: () => { },
            },
          ]
        );
      } else {
        // User is logged in immediately
        Alert.alert("Success", "Account created successfully!", [
          {
            text: "OK",
            onPress: () => { },
          },
        ]);
      }
    } catch (error: any) {
      console.error("🎯 SignupScreen: Signup error:", error);
      Alert.alert("Error", error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join HeyJ today</Text>

          {/* Profile Picture */}
          <TouchableOpacity onPress={getProfilePic} style={styles.imageContainer}>
            <Image
              style={styles.profileImage}
              source={{
                uri: profileImage?.uri || defaultProfileImage,
              }}
            />
            <View style={styles.imageOverlay}>
              <AntDesign name="camera" size={30} color="#fff" />
              <Text style={styles.imageOverlayText}>
                {profileImage ? "Change Photo" : "Add Photo"}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.optionalText}>(Optional)</Text>

          {/* Full Name Field */}
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          {/* Password */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[0, 1, 2, 3, 4].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.strengthBar,
                      index <= passwordStrength.score && {
                        backgroundColor: passwordStrength.color,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text
                style={[
                  styles.strengthLabel,
                  { color: passwordStrength.color },
                ]}
              >
                {passwordStrength.label}
              </Text>

              {/* Requirements Checklist */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password must have:</Text>
                <RequirementItem
                  met={passwordStrength.requirements.length}
                  text="At least 12 characters"
                />
                <RequirementItem
                  met={passwordStrength.requirements.uppercase}
                  text="One uppercase letter (A-Z)"
                />
                <RequirementItem
                  met={passwordStrength.requirements.lowercase}
                  text="One lowercase letter (a-z)"
                />
                <RequirementItem
                  met={passwordStrength.requirements.number}
                  text="One number (0-9)"
                />
                <RequirementItem
                  met={passwordStrength.requirements.special}
                  text="One special character (!@#$%^&*)"
                />
              </View>
            </View>
          )}

          {/* Confirm Password */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
            />
            {confirmPassword.length > 0 && (
              <View style={styles.matchIcon}>
                <Ionicons
                  name={
                    password === confirmPassword
                      ? "checkmark-circle"
                      : "close-circle"
                  }
                  size={24}
                  color={password === confirmPassword ? "#00cc44" : "#ff4444"}
                />
              </View>
            )}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <View style={styles.requirementItem}>
    <Ionicons
      name={met ? "checkmark-circle" : "ellipse-outline"}
      size={16}
      color={met ? "#00cc44" : "#999"}
    />
    <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
      {text}
    </Text>
  </View>
);

export default SignupScreen;
