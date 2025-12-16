import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";
import Profile from "../../objects/Profile";
// @ts-expect-error
import { AntDesign, MaterialCommunityIcons } from "react-native-vector-icons";
import {
  MediaType,
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { openSettings } from "expo-linking";
import { supabase } from "../../utilities/Supabase";
import { useProfile } from "../../utilities/ProfileProvider";
import { useConversations } from "../../utilities/ConversationsProvider";
import { useFriends } from "../../utilities/FriendsProvider";
import {
  ActionSheetProvider,
} from "@expo/react-native-action-sheet";
import Conversation from "../../objects/Conversation";
import UUID from "react-native-uuid";
import AddFriendModal from "./AddFriendModal";
import { findOrCreateConversation } from "../../utilities/FindOrCreateConversation";

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

  const styles = Styles();

  const [showAddFriend, setShowAddFriend] = useState(false);

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
            setShowAddFriend(false);
          }}
        >
          <TouchableWithoutFeedback style={styles.modal}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Profile Details</Text>

              <TouchableOpacity onPress={getProfilePic}>
                <Image
                  style={styles.image}
                  source={{
                    uri: profile?.profilePicture,
                  }}
                />
                <View style={styles.plusButton}>
                  <AntDesign
                    name="plus"
                    color={styles.modalSheet.backgroundColor}
                    size={24}
                  />
                </View>
              </TouchableOpacity>

              <Text style={styles.labelText}>
                {profile?.name || "---"}
              </Text>

              <View style={styles.divider} />

              {/* Buttons Container */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={styles.addFriendButton}
                  onPress={() => setShowAddFriend(true)}
                >
                  <MaterialCommunityIcons name="account-plus" size={24} color="#000" />
                  <Text style={styles.addFriendButtonText}>Add Friend by Code</Text>
                </TouchableOpacity>
                
                <AddFriendModal
                  visible={showAddFriend}
                  onClose={() => setShowAddFriend(false)}
                />

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => {
                    supabase.auth.signOut();
                  }}
                >
                  <Text style={styles.saveLabel}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </ActionSheetProvider>
    </Modal>
  );
};

export default ViewProfileModal;

const Styles = () =>
  StyleSheet.create({
    modal: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    modalSheet: {
      width: Dimensions.get("screen").width * 0.8,
      backgroundColor: "#F9F9F9",
      paddingTop: 65,
      paddingBottom: 85,
      alignItems: "center",
      borderRadius: 15,
      borderColor: "#A2A2A2",
      borderWidth: 0.5,
      zIndex: 1000,
      shadowColor: "#A2A2A2",
      shadowOpacity: 0.5,
      shadowOffset: { width: 3, height: 3 },
    },
    modalTitle: {
      top: 15,
      alignSelf: "center",
      position: "absolute",
      color: "#515151",
      fontSize: 25,
      fontWeight: "600",
    },
    image: {
      width: 150,
      height: 150,
      borderRadius: 75,
      borderColor: "#000",
      borderWidth: 0.5,
    },
    plusButton: {
      width: 48,
      height: 60,
      backgroundColor: "#000",
      borderColor: "#FFF",
      borderRadius: 8,
      borderWidth: 1,
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
      bottom: 10,
      right: 10,
    },
    labelText: {
      marginTop: 15,
      fontSize: 20,
      fontWeight: "600",
    },
    divider: {
      width: "80%",
      borderBottomWidth: 0.5,
      borderBottomColor: "#515151",
      marginVertical: 15,
    },
    buttonsContainer: {
      width: "85%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    addFriendButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#E8E8E8",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      height: 48,
      gap: 10,
    },
    addFriendButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#000",
    },
    addFriendContainer: {
      width: "85%",
      backgroundColor: "#FFF",
      padding: 15,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#E0E0E0",
    },
    addFriendTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 10,
      color: "#333",
    },
    friendCodeInput: {
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      marginBottom: 12,
      backgroundColor: "#FAFAFA",
    },
    addFriendButtons: {
      flexDirection: "row",
      gap: 10,
    },
    friendButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: "#F0F0F0",
    },
    cancelButtonText: {
      color: "#666",
      fontWeight: "600",
    },
    confirmButton: {
      backgroundColor: "#000",
    },
    confirmButtonText: {
      color: "#FFF",
      fontWeight: "600",
    },
    saveLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: "#000",
    },
    saveButton: {
      flex: 1,
      height: 48,
      borderRadius: 10,
      borderColor: "#A2A2A2",
      borderWidth: 0.5,
      backgroundColor: "#C2C2C2",
      alignItems: "center",
      justifyContent: "center",
    },
  });
