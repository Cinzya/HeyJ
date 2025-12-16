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
import * as Clipboard from 'expo-clipboard';
import Profile from "../../objects/Profile";
// @ts-expect-error
import { AntDesign, MaterialCommunityIcons, Ionicons } from "react-native-vector-icons";
import {
  MediaType,
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { openSettings } from "expo-linking";
import { supabase } from "../../utilities/Supabase";
import { useProfile } from "../../utilities/ProfileProvider";
import {
  ActionSheetProvider,
} from "@expo/react-native-action-sheet";
import Conversation from "../../objects/Conversation";
import UUID from "react-native-uuid";

const ViewProfileModal = () => {
  const {
    viewProfile,
    profile,
    saveProfile,
    setViewProfile,
    getProfile,
    conversations,
    profiles,
  } = useProfile();

  const styles = Styles();

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCode, setFriendCode] = useState("");

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

  const copyUserCode = async () => {
    if (profile?.userCode) {
      await Clipboard.setStringAsync(profile.userCode);
      Alert.alert("Copied!", `Your code "${profile.userCode}" has been copied to clipboard.`, [
        { text: "OK", style: "default" }
      ]);
    }
  };

  const addFriendByCode = async () => {
    if (!profile) {
      return;
    }

    // Trim and normalize the input
    const trimmedCode = friendCode.trim();

    if (!trimmedCode) {
      Alert.alert("Error", "Please enter a friend code.");
      return;
    }

    // Case-insensitive comparison for self-check
    if (trimmedCode.toLowerCase() === profile.userCode?.toLowerCase()) {
      Alert.alert("Error", "You cannot add yourself as a friend.");
      return;
    }

    try {
      const searchCodeLower = trimmedCode.toLowerCase().trim();
      console.log("🔍 Searching for userCode (case-insensitive):", trimmedCode);
      console.log("🔍 Normalized search code:", searchCodeLower);
      console.log("🔍 Current user's code:", profile.userCode);

      let data = null;
      let error = null;

      // Always do case-insensitive search to handle any case variation
      console.log("🔍 Fetching all profiles for case-insensitive search...");
      const { data: allData, error: allError } = await supabase
        .from("profiles")
        .select("userCode,uid,name,email,profilePicture,conversations");

      if (allError) {
        error = allError;
        console.error("❌ Database error:", allError);
      } else if (allData) {
        console.log(`🔍 Fetched ${allData.length} profiles from database`);

        // Filter out profiles without userCode and log them
        const profilesWithCode = allData.filter(p => p.userCode);
        const profilesWithoutCode = allData.filter(p => !p.userCode);

        if (profilesWithoutCode.length > 0) {
          console.log(`⚠️ Found ${profilesWithoutCode.length} profiles without userCode`);
        }

        // Case-insensitive search: find user where userCode matches (case-insensitive)
        // Also trim userCode from database in case there's whitespace
        const foundUser = profilesWithCode.find(
          (profile) => {
            const dbCode = profile.userCode?.trim().toLowerCase();
            const match = dbCode === searchCodeLower;
            if (match) {
              console.log(`✅ Match found! DB code: "${profile.userCode}", normalized: "${dbCode}", search: "${searchCodeLower}"`);
            }
            return match;
          }
        );

        if (foundUser) {
          data = foundUser;
          console.log("✅ Found user:", foundUser.name, "with code:", foundUser.userCode);
        } else {
          console.log("❌ No matching userCode found");
          console.log(`🔍 Searched ${profilesWithCode.length} profiles with userCode`);
          console.log("🔍 Sample codes in DB:", profilesWithCode.slice(0, 10).map(p => `"${p.userCode}"`));
          console.log("🔍 All codes (first 20):", profilesWithCode.slice(0, 20).map(p => ({
            code: p.userCode,
            normalized: p.userCode?.trim().toLowerCase(),
            name: p.name
          })));
        }
      } else {
        console.log("⚠️ No data returned from database");
      }

      console.log("🔍 Final search result:", {
        found: !!data,
        error: error?.message,
        searchedCode: trimmedCode,
        normalizedSearch: searchCodeLower,
        foundCode: data?.userCode,
        foundName: data?.name
      });

      if (error) {
        Alert.alert("Error", `Database error: ${error.message}`);
        return;
      }

      if (!data) {
        Alert.alert("Not Found", `No user found with code "${trimmedCode}". Please check and try again.`);
        return;
      }

      console.log("✅ User found:", data.name, "with code:", data.userCode);
      await startConversation(data.uid);
      setFriendCode("");
      setShowAddFriend(false);
    } catch (error) {
      console.error("❌ Error adding friend:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
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

    const { data, error } = await supabase
      .from("profiles")
      .select()
      .eq("uid", uid);

    if (data && data[0]) {
      const otherProfile = data[0];
      const existingConversation = conversations.find(
        (c) => c.uids.includes(uid) && c.uids.includes(profile.uid)
      );

      if (!existingConversation) {
        const conversationId = UUID.v4().toString();
        const conversation = new Conversation(
          conversationId,
          [uid, profile.uid],
          [],
          [
            { uid: uid, timestamp: new Date() },
            { uid: profile.uid, timestamp: new Date() },
          ]
        );

        const { error: insertError } = await supabase
          .from("conversations")
          .insert(conversation.toJSON());

        if (!insertError) {
          // Ensure conversations arrays are always arrays
          const otherConversations = Array.isArray(otherProfile.conversations)
            ? otherProfile.conversations
            : [];
          const currentConversations = Array.isArray(profile.conversations)
            ? profile.conversations
            : [];

          // Update other user's profile
          const { error: e1 } = await supabase.from("profiles").upsert({
            ...otherProfile,
            conversations: [...otherConversations, conversationId],
          });

          // Update current user's profile
          const { error: e2 } = await supabase.from("profiles").upsert({
            ...profile.toJSON(),
            conversations: [...currentConversations, conversationId],
          });

          if (e1) {
            console.error("Error updating other profile:", e1);
          }
          if (e2) {
            console.error("Error updating current profile:", e2);
          }

          if (!e1 && !e2) {
            // Refresh profile to get updated conversations
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure DB is updated
            getProfile();
            Alert.alert("Success!", `You can now chat with ${otherProfile.name}!`, [
              { text: "OK", onPress: () => setViewProfile(false) }
            ]);
          } else {
            Alert.alert("Error", "Failed to update profiles. Please try again.");
          }
        } else {
          console.error("Error creating conversation:", insertError);
          Alert.alert("Error", "Failed to create conversation. Please try again.");
        }
      } else {
        Alert.alert("Already Connected", `You already have a conversation with ${otherProfile.name}.`);
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
                    size={25}
                  />
                </View>
              </TouchableOpacity>

              <Text style={styles.labelText}>
                {profile?.name || "---"}
              </Text>

              {/* User Code Display */}
              <TouchableOpacity
                style={styles.userCodeContainer}
                onPress={copyUserCode}
              >
                <Text style={styles.userCodeLabel}>Your Code:</Text>
                <Text style={styles.userCode}>{profile?.userCode || "Loading..."}</Text>
                <Ionicons name="copy-outline" size={20} color="#666" />
              </TouchableOpacity>
              <Text style={styles.hintText}>Tap to copy</Text>

              <View style={styles.divider} />

              {/* Add Friend Section */}
              {!showAddFriend ? (
                <TouchableOpacity
                  style={styles.addFriendButton}
                  onPress={() => setShowAddFriend(true)}
                >
                  <MaterialCommunityIcons name="account-plus" size={24} color="#000" />
                  <Text style={styles.addFriendButtonText}>Add Friend by Code</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.addFriendContainer}>
                  <Text style={styles.addFriendTitle}>Enter Friend Code</Text>
                  <TextInput
                    style={styles.friendCodeInput}
                    placeholder="e.g., John@1234"
                    value={friendCode}
                    onChangeText={setFriendCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.addFriendButtons}>
                    <TouchableOpacity
                      style={[styles.friendButton, styles.cancelButton]}
                      onPress={() => {
                        setShowAddFriend(false);
                        setFriendCode("");
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.friendButton, styles.confirmButton]}
                      onPress={addFriendByCode}
                    >
                      <Text style={styles.confirmButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  supabase.auth.signOut();
                }}
              >
                <Text style={styles.saveLabel}>Sign Out</Text>
              </TouchableOpacity>
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
      width: 35,
      height: 35,
      backgroundColor: "#000",
      borderColor: "#FFF",
      borderRadius: 50,
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
    userCodeContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFF",
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 10,
      borderWidth: 1,
      borderColor: "#E0E0E0",
      gap: 8,
    },
    userCodeLabel: {
      fontSize: 14,
      color: "#666",
      fontWeight: "500",
    },
    userCode: {
      fontSize: 16,
      fontWeight: "700",
      color: "#000",
      flex: 1,
    },
    hintText: {
      fontSize: 12,
      color: "#999",
      marginTop: 5,
    },
    divider: {
      width: "80%",
      borderBottomWidth: 0.5,
      borderBottomColor: "#515151",
      marginVertical: 15,
    },
    addFriendButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#E8E8E8",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
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
      fontSize: 20,
      fontWeight: "600",
    },
    saveButton: {
      width: "50%",
      height: 50,
      borderRadius: 15,
      borderColor: "#A2A2A2",
      borderWidth: 0.5,
      backgroundColor: "#C2C2C2",
      bottom: 15,
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
  });
