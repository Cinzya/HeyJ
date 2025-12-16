import { create } from "zustand";
import { Alert } from "react-native";
import FriendRequest from "../objects/FriendRequest";
import Profile from "../objects/Profile";

interface FriendRequestActionsState {
  handleAccept: (
    request: FriendRequest,
    requesterProfile: Profile,
    acceptFriendRequest: (id: string) => Promise<{ success: boolean; error?: string }>,
    getFriendRequests: () => Promise<void>,
    getFriends: () => Promise<void>
  ) => Promise<void>;
  handleDecline: (
    requestId: string,
    rejectFriendRequest: (id: string) => Promise<{ success: boolean; error?: string }>,
    getFriendRequests: () => Promise<void>
  ) => Promise<void>;
}

export const useFriendRequestActionsStore = create<FriendRequestActionsState>(
  () => ({
    handleAccept: async (
      request,
      requesterProfile,
      acceptFriendRequest,
      getFriendRequests,
      getFriends
    ) => {
      try {
        // Accept the friend request
        const result = await acceptFriendRequest(request.id);
        if (!result.success) {
          Alert.alert("Error", result.error || "Failed to accept friend request");
          return;
        }

        // No conversation is created automatically - users can start conversations via the "To:" dropdown

        // Refresh friend requests list
        await getFriendRequests();
        // Refresh friends list
        await getFriends();
      } catch (error) {
        console.error("Error accepting friend request:", error);
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
    },

    handleDecline: async (requestId, rejectFriendRequest, getFriendRequests) => {
      const result = await rejectFriendRequest(requestId);
      if (result.success) {
        await getFriendRequests();
      } else {
        Alert.alert("Error", result.error || "Failed to decline friend request");
      }
    },
  })
);

