// React
import React, { useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";

// Third-party libraries
import { Ionicons } from "@expo/vector-icons";

// Utilities & Providers
import { useProfile } from "../utilities/ProfileProvider";
import { useFriends } from "../utilities/FriendsProvider";

// Hooks
import { useRequesterProfiles } from "../hooks/useProfileData";

// Components
import IncomingRequestItem from "../components/friendRequests/IncomingRequestItem";
import OutgoingRequestItem from "../components/friendRequests/OutgoingRequestItem";
import FriendRequestsEmpty from "../components/friendRequests/FriendRequestsEmpty";

// Objects & Types
import FriendRequest from "../objects/FriendRequest";
import { FriendRequestsScreenProps } from "../types/navigation";

// Styles
import { styles } from "../styles/screens/FriendRequestsScreen.styles";

const FriendRequestsScreen = ({ navigation }: FriendRequestsScreenProps) => {
  const { profile } = useProfile();
  const {
    friendRequests,
    getFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    blockUser,
    cancelFriendRequest,
  } = useFriends();

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

    return (
      <IncomingRequestItem
        request={item}
        requesterProfile={requesterProfile}
        onAccept={() => handleAccept(item.id)}
        onReject={() => handleReject(item.id)}
        onBlock={() => handleBlock(item.id)}
      />
    );
  };

  const renderOutgoingRequest = ({ item }: { item: FriendRequest }) => {
    const addresseeProfile = requesterProfiles.get(item.addresseeId);
    if (!addresseeProfile) {
      return null;
    }

    return (
      <OutgoingRequestItem
        request={item}
        addresseeProfile={addresseeProfile}
        onCancel={() => handleCancel(item.id)}
      />
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
        <FriendRequestsEmpty />
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

