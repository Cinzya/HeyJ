// React
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";

// Third-party libraries
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { openSettings } from "expo-linking";
import UUID from "react-native-uuid";

// Utilities & Providers
import { supabase } from "../../utilities/Supabase";
import { useProfile } from "../../utilities/ProfileProvider";
import { useConversations } from "../../utilities/ConversationsProvider";
import { useFriends } from "../../utilities/FriendsProvider";
import { findOrCreateConversation } from "../../utilities/FindOrCreateConversation";

// Components
import ProfileImageSection from "./ProfileImageSection";
import ProfileButtons from "./ProfileButtons";

// Objects
import Profile from "../../objects/Profile";
import Conversation from "../../objects/Conversation";

// Styles
import { createStyles } from "../../styles/components/profile/ViewProfileModal.styles";

const ViewProfileModal = () => {
  const {
    viewProfile,
    profile,
    saveProfile,
    setViewProfile,
    getProfile,
  } = useProfile();
  const { conversations, profiles } = useConversations();
  const { friendRequests, checkFriendshipStatus } = useFriends();

  const styles = createStyles();

  const getProfilePic = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status === "granted") {
      const newPic = await launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        selectionLimit: 1,
      });

      if (newPic.canceled) {
        Alert.alert(
          "Something went wrong...",
          "You cancelled your selection. Please try again.",
          [{ text: "Ok", style: "default" }]
        );
        return;
      }

      if (!newPic.canceled && newPic.assets[0].uri !== null) {
        uploadProfilePic(newPic.assets[0].uri);
      } else {
        Alert.alert("Something went wrong...", "Please try again.", [
          { text: "Ok", style: "default" },
        ]);
      }
    } else if (status === "undetermined") {
      getProfilePic();
    } else {
      Alert.alert(
        "Something went wrong...",
        "Please open settings and confirm that this app has permission to the selected photo.",
        [
          { text: "Cancel", style: "destructive" },
          { text: "Open", style: "default", onPress: () => openSettings() },
        ]
      );
    }
  };

  const uploadProfilePic = async (uri: string) => {
    if (!profile) {
      return;
    }

    const fileName = `profile_${profile.uid}_${new Date().getTime()}.png`;
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("profile_images")
      .upload(fileName, buffer, { contentType: "image/png" });

    if (error) {
      console.error("Error uploading profile image:", error.message);
      saveProfile(
        new Profile(
          profile.uid,
          profile.profilePicture,
          profile.name,
          profile.email,
          [],
          profile.userCode
        )
      );
    }

    if (data) {
      const publicUrl = supabase.storage
        .from("profile_images")
        .getPublicUrl(fileName).data.publicUrl;

      saveProfile(
        new Profile(
          profile.uid,
          publicUrl,
          profile.name,
          profile.email,
          [],
          profile.userCode
        )
      );
    }
  };

  const startConversation = async (uid: string) => {
    if (!profile) {
      return;
    }

    if (uid === profile.uid) {
      Alert.alert("Error", "You cannot start a conversation with yourself.");
      return;
    }

    // Check if users are friends
    const friendshipStatus = await checkFriendshipStatus(uid);
    if (friendshipStatus !== "accepted") {
      Alert.alert(
        "Not Friends",
        "You must be friends with this user to start a conversation."
      );
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select()
      .eq("uid", uid);

    if (data && data[0]) {
      const otherProfile = data[0];
      
      try {
        // Use findOrCreateConversation to ensure we don't create duplicates
        const result = await findOrCreateConversation(profile.uid, uid);
        const conversation = result.conversation;
        const conversationId = conversation.conversationId;

        // Fetch latest profiles to ensure we have current conversations
        const { data: otherProfileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("uid", uid)
          .single();

        // Ensure conversations arrays are always arrays
        const otherConversations = otherProfileData && Array.isArray(otherProfileData.conversations)
          ? otherProfileData.conversations
          : [];
        const currentConversations = Array.isArray(profile.conversations)
          ? profile.conversations
          : [];

        // Update other user's profile if needed
        if (!otherConversations.includes(conversationId)) {
          const { error: e1 } = await supabase
            .from("profiles")
            .update({
              conversations: [...otherConversations, conversationId],
            })
            .eq("uid", uid);

          if (e1) {
            console.error("Error updating other profile:", e1);
          }
        }

        // Update current user's profile if needed
        if (!currentConversations.includes(conversationId)) {
          const { error: e2 } = await supabase
            .from("profiles")
            .update({
              conversations: [...currentConversations, conversationId],
            })
            .eq("uid", profile.uid);

          if (e2) {
            console.error("Error updating current profile:", e2);
          }
        }

        // Refresh profile to get updated conversations
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure DB is updated
        getProfile();
        Alert.alert("Success!", `You can now chat with ${otherProfile.name}!`, [
          { text: "OK", onPress: () => setViewProfile(false) }
        ]);
      } catch (error) {
        console.error("Error finding/creating conversation:", error);
        Alert.alert("Error", "Failed to create conversation. Please try again.");
      }
    } else {
      Alert.alert("Error", "Could not find user profile.");
    }
  };

  return (
    <Modal visible={profile !== null && viewProfile} transparent>
      <ActionSheetProvider>
        <TouchableOpacity
          style={{
            flex: 1,
            height: "100%",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
          onPress={() => {
            setViewProfile(false);
          }}
        >
          <TouchableWithoutFeedback style={styles.modal}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Profile Details</Text>

              <ProfileImageSection
                profilePicture={profile?.profilePicture || ""}
                onPress={getProfilePic}
                styles={styles}
              />

              <Text style={styles.labelText}>
                {profile?.name || "---"}
              </Text>

              <View style={styles.divider} />

              <ProfileButtons styles={styles} />
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </ActionSheetProvider>
    </Modal>
  );
};

export default ViewProfileModal;
