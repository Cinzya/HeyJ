import { create } from "zustand";
import { sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import FriendRequest from "../objects/FriendRequest";
import Profile from "../objects/Profile";
import { lastMessageTimestamp } from "../utilities/conversationUtils";

export type ConversationListItem =
  | { type: "conversation"; data: Conversation }
  | { type: "friendRequest"; data: FriendRequest; requesterProfile: Profile };

interface ConversationListState {
  selectedConversation: string | null;
  sortedListItems: ConversationListItem[];
  setSelectedConversation: (id: string | null) => void;
  computeSortedListItems: (
    conversations: Conversation[],
    friendRequests: FriendRequest[],
    requesterProfilesMap: Map<string, Profile>,
    profile: Profile | null
  ) => void;
  selectFirstConversation: () => void;
}

export const useConversationListStore = create<ConversationListState>(
  (set, get) => ({
    selectedConversation: null,
    sortedListItems: [],

    setSelectedConversation: (id: string | null) => {
      set({ selectedConversation: id });
    },

    computeSortedListItems: (
      conversations,
      friendRequests,
      requesterProfilesMap,
      profile
    ) => {
      if (!profile) {
        set({ sortedListItems: [] });
        return;
      }

      const items: ConversationListItem[] = [];

      // Add incoming pending friend requests at the top
      const incomingPending = friendRequests.filter(
        (req) => req.addresseeId === profile.uid && req.status === "pending"
      );

      incomingPending.forEach((request) => {
        const requesterProfile = requesterProfilesMap.get(request.requesterId);
        if (requesterProfile) {
          items.push({
            type: "friendRequest",
            data: request,
            requesterProfile: requesterProfile,
          });
        }
      });

      // Sort friend requests by created_at (newest first)
      items.sort((a, b) => {
        if (a.type === "friendRequest" && b.type === "friendRequest") {
          return b.data.createdAt.getTime() - a.data.createdAt.getTime();
        }
        return 0;
      });

      // Add conversations below friend requests
      // Sort conversations by last message timestamp (empty conversations go to the end)
      const sortedConversations = sortBy(conversations, (c) => {
        if (c.messages.length === 0) {
          return new Date(0); // Empty conversations sorted to the end
        }
        return lastMessageTimestamp(c);
      }).reverse();

      sortedConversations.forEach((conversation) => {
        items.push({
          type: "conversation",
          data: conversation,
        });
      });

      set({ sortedListItems: items });
    },

    selectFirstConversation: () => {
      const { sortedListItems } = get();
      const firstConversation = sortedListItems.find(
        (item) => item.type === "conversation"
      );

      if (firstConversation && firstConversation.type === "conversation") {
        set({ selectedConversation: firstConversation.data.conversationId });
      }
    },
  })
);

