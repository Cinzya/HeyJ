import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { styles } from "../styles/FriendRequestsScreen.styles";
import { useProfile } from "../utilities/ProfileProvider";
import FriendRequest from "../objects/FriendRequest";
import Profile from "../objects/Profile";
// @ts-expect-error
import { Ionicons } from "react-native-vector-icons";
import { useRequesterProfiles } from "../hooks/useProfileData";

const FriendRequestsScreen = ({ navigation }: { navigation: any }) => {
  const {
    profile,
    friendRequests,
    getFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    blockUser,
    cancelFriendRequest,
  } = useProfile();

  const requesterProfiles = useRequesterProfiles(profile, friendRequests);

  useEffect(() => {
    if (profile) {
      getFriendRequests();
    }
  }, [profile]);

  const incomingRequests = friendRequests.filter(
    (req) => req.addresseeId === profile?.uid && req.status === "pending"
  );

  const outgoingRequests = friendRequests.filter(
    (req) => req.requesterId === profile?.uid && req.status === "pending"
  );

  const handleAccept = async (requestId: string) => {
    const result = await acceptFriendRequest(requestId);
    if (result.success) {
      Alert.alert("Success", "Friend request accepted!");
    } else {
      Alert.alert("Error", result.error || "Failed to accept request");
    }
  };

  const handleReject = async (requestId: string) => {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this friend request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            const result = await rejectFriendRequest(requestId);
            if (result.success) {
              Alert.alert("Request Rejected", "The friend request has been rejected.");
            } else {
              Alert.alert("Error", result.error || "Failed to reject request");
            }
          },
        },
      ]
    );
  };

  const handleBlock = async (requestId: string) => {
    Alert.alert(
      "Block User",
      "Are you sure you want to block this user? They won't be able to send you friend requests.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            const result = await blockUser(requestId);
            if (result.success) {
              Alert.alert("User Blocked", "This user has been blocked.");
            } else {
              Alert.alert("Error", result.error || "Failed to block user");
            }
          },
        },
      ]
    );
  };

  const handleCancel = async (requestId: string) => {
    const result = await cancelFriendRequest(requestId);
    if (result.success) {
      Alert.alert("Request Cancelled", "Friend request has been cancelled.");
    } else {
      Alert.alert("Error", result.error || "Failed to cancel request");
    }
  };

  const renderIncomingRequest = ({ item }: { item: FriendRequest }) => {
    const requesterProfile = requesterProfiles.get(item.requesterId);
    if (!requesterProfile) {
      return null;
    }

    // Check if request was updated (indicates it might have been rejected before)
    const wasUpdated = item.updatedAt.getTime() > item.createdAt.getTime() + 1000; // 1 second buffer

    return (
      <View style={styles.requestItem}>
        <Image
          style={styles.profilePicture}
          source={{ uri: requesterProfile.profilePicture }}
        />
        <View style={styles.requestInfo}>
          <Text style={styles.name}>{requesterProfile.name}</Text>
          <Text style={styles.userCode}>{requesterProfile.userCode}</Text>
          {wasUpdated && (
            <Text style={styles.warningText}>
              This user has sent you a request before
            </Text>
          )}
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={() => handleAccept(item.id)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.blockButton, wasUpdated && styles.blockButtonProminent]}
            onPress={() => handleBlock(item.id)}
          >
            <Text style={styles.blockButtonText}>Block</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOutgoingRequest = ({ item }: { item: FriendRequest }) => {
    const addresseeProfile = requesterProfiles.get(item.addresseeId);
    if (!addresseeProfile) {
      return null;
    }

    return (
      <View style={styles.requestItem}>
        <Image
          style={styles.profilePicture}
          source={{ uri: addresseeProfile.profilePicture }}
        />
        <View style={styles.requestInfo}>
          <Text style={styles.name}>{addresseeProfile.name}</Text>
          <Text style={styles.userCode}>{addresseeProfile.userCode}</Text>
          <Text style={styles.pendingText}>Pending...</Text>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => handleCancel(item.id)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friend Requests</Text>
      </View>

      {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-add-outline" size={64} color="#999" />
          <Text style={styles.emptyText}>No friend requests</Text>
        </View>
      ) : (
        <>
          {incomingRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Incoming ({incomingRequests.length})
              </Text>
              <FlatList
                data={incomingRequests}
                renderItem={renderIncomingRequest}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          )}

          {outgoingRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Outgoing ({outgoingRequests.length})
              </Text>
              <FlatList
                data={outgoingRequests}
                renderItem={renderOutgoingRequest}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
};

export default FriendRequestsScreen;

