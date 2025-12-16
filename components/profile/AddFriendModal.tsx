import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";
// @ts-expect-error
import { MaterialCommunityIcons, Ionicons } from "react-native-vector-icons";
import { useProfile } from "../../utilities/ProfileProvider";
import { useFriends } from "../../utilities/FriendsProvider";
import * as Clipboard from 'expo-clipboard';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddFriendModal = ({ visible, onClose }: AddFriendModalProps) => {
  const { profile } = useProfile();
  const { sendFriendRequest } = useFriends();
  const [friendCode, setFriendCode] = useState("");

  const styles = Styles();

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
      const result = await sendFriendRequest(trimmedCode);

      if (result.success) {
        Alert.alert("Success!", "Friend request sent!", [
          { text: "OK", onPress: () => {
            setFriendCode("");
            onClose();
          }}
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to send friend request");
      }
    } catch (error) {
      console.error("❌ Error adding friend:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const handleClose = () => {
    setFriendCode("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableWithoutFeedback>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Friend</Text>

            {/* User Info Section */}
            {profile && (
              <View style={styles.userInfoSection}>
                <Text style={styles.userName}>{profile.name || "---"}</Text>
                <TouchableOpacity
                  style={styles.userCodeContainer}
                  onPress={copyUserCode}
                >
                  <Text style={styles.userCodeLabel}>Your Code:</Text>
                  <Text style={styles.userCode}>{profile.userCode || "Loading..."}</Text>
                  <Ionicons name="copy-outline" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.hintText}>Tap to copy</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Add Friend Form */}
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
                  onPress={handleClose}
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
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

export default AddFriendModal;

const Styles = () =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalSheet: {
      width: Dimensions.get("screen").width * 0.8,
      backgroundColor: "#F9F9F9",
      paddingTop: 65,
      paddingBottom: 35,
      paddingHorizontal: 20,
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
    userInfoSection: {
      width: "100%",
      alignItems: "center",
      marginTop: 20,
    },
    userName: {
      fontSize: 20,
      fontWeight: "600",
      marginBottom: 10,
      color: "#000",
    },
    userCodeContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFF",
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 5,
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
      width: "100%",
      borderBottomWidth: 0.5,
      borderBottomColor: "#515151",
      marginVertical: 20,
    },
    addFriendContainer: {
      width: "100%",
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
  });

