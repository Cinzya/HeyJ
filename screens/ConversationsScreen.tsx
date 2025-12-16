import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
} from "react-native";
// @ts-expect-error
import { Entypo, FontAwesome } from "react-native-vector-icons";
import { useProfile } from "../utilities/ProfileProvider";
import { sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import FriendRequest from "../objects/FriendRequest";
import Profile from "../objects/Profile";
import { useEffect, useState, useRef } from "react";
import { format, isToday, isYesterday, isThisWeek, isBefore } from "date-fns";
import { useNavigation } from "@react-navigation/native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { documentDirectory, createDownloadResumable } from "expo-file-system/legacy";
// OneSignal is mocked - see mocks/react-native-onesignal.js
import {
  NotificationClickEvent,
  NotificationWillDisplayEvent,
  OneSignal,
} from "react-native-onesignal";
import { updateLastRead } from "../utilities/UpdateConversation";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";
import { supabase } from "../utilities/Supabase";
import UUID from "react-native-uuid";

type ConversationListItem =
  | { type: "conversation"; data: Conversation }
  | { type: "friendRequest"; data: FriendRequest; requesterProfile: Profile };

const ConversationsScreen = ({
  selectedConversation,
  setSelectedConversation,
}: {
  selectedConversation: string | null;
  setSelectedConversation: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const navigation = useNavigation();
  const {
    profile,
    conversations,
    profiles,
    getProfile,
    friendRequests,
    getFriendRequests,
    getFriends,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useProfile();
  const { autoplay } = useAudioSettings();

  const [sortedListItems, setSortedListItems] = useState<
    ConversationListItem[]
  >([]);
  const [requesterProfilesMap, setRequesterProfilesMap] = useState<
    Map<string, Profile>
  >(new Map());

  const lastMessageTimestamp = (conversation: Conversation) => {
    if (conversation.messages.length === 0) {
      return new Date(0); // Return epoch for empty conversations
    }
    const messages = sortBy(conversation.messages, (m) => m.timestamp);
    const lastMessage = messages[messages.length - 1];

    return lastMessage.timestamp;
  };

  const lastMessageFromOtherUser = (conversation: Conversation) => {
    const messages = sortBy(
      conversation.messages.filter((m) => m.uid !== profile?.uid),
      (m) => m.timestamp
    );
    const lastMessage = messages[messages.length - 1];

    return lastMessage;
  };

  useEffect(() => {
    if (profile) {
      getFriendRequests();
    }
  }, [profile]);

  useEffect(() => {
    const fetchRequesterProfiles = async () => {
      if (!profile || friendRequests.length === 0) {
        setRequesterProfilesMap(new Map());
        return;
      }

      const profilesMap = new Map<string, Profile>();
      const incomingPending = friendRequests.filter(
        (req) => req.addresseeId === profile.uid && req.status === "pending"
      );

      if (incomingPending.length === 0) {
        setRequesterProfilesMap(new Map());
        return;
      }

      const requesterUids = incomingPending.map((req) => req.requesterId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("uid", requesterUids);

      if (!error && data) {
        data.forEach((p) => {
          profilesMap.set(p.uid, Profile.fromJSON(p));
        });
      }

      setRequesterProfilesMap(profilesMap);
    };

    fetchRequesterProfiles();
  }, [friendRequests, profile]);

  useEffect(() => {
    const firstConversation = sortedListItems.find(
      (item) => item.type === "conversation"
    );

    if (firstConversation && firstConversation.type === "conversation") {
      setSelectedConversation(firstConversation.data.conversationId);
    }
  }, [sortedListItems]);

  const audioPlayer = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(audioPlayer);

  // Track which conversation is currently playing
  const [currentlyPlayingConversationId, setCurrentlyPlayingConversationId] = useState<string | null>(null);
  const lastMessageCountsRef = useRef<Record<string, number>>({});

  const getSortedListItems = () => {
    if (!profile) {
      setSortedListItems([]);
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
        return (
          b.data.createdAt.getTime() - a.data.createdAt.getTime()
        );
      }
      return 0;
    });

    // Add conversations below friend requests
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsScreen.tsx:174',message:'before sorting conversations',data:{totalConversations:conversations.length,conversationIds:conversations.map(c=>c.conversationId),messageCounts:conversations.map(c=>({id:c.conversationId,count:c.messages.length}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsScreen.tsx:189',message:'setSortedListItems',data:{totalItems:items.length,conversationItems:items.filter(i=>i.type==='conversation').length,friendRequestItems:items.filter(i=>i.type==='friendRequest').length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    setSortedListItems(items);
  };

  useEffect(() => {
    getSortedListItems();
  }, [conversations, friendRequests, requesterProfilesMap, profile]);

  // Auto-play new messages when they arrive and autoplay is enabled
  useEffect(() => {
    if (!autoplay || !profile || conversations.length === 0) {
      // Update message counts
      conversations.forEach((c) => {
        lastMessageCountsRef.current[c.conversationId] = c.messages.length;
      });
      return;
    }

    // Check each conversation for new unheard messages
    conversations.forEach((conversation) => {
      const currentCount = conversation.messages.length;
      const lastCount = lastMessageCountsRef.current[conversation.conversationId] || 0;

      // Only proceed if a new message was added
      if (currentCount > lastCount) {
        const otherUserUid = conversation.uids.filter((id) => id !== profile.uid)[0];
        if (!otherUserUid) {
          lastMessageCountsRef.current[conversation.conversationId] = currentCount;
          return;
        }

        // Find the newest unheard message from the other user
        const unheardMessages = conversation.messages
          .filter(
            (m) =>
              m.uid === otherUserUid && // From other user
              !m.isRead // Not read yet
          )
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp, newest first

        if (unheardMessages.length > 0) {
          const newestUnheard = unheardMessages[0];

          // Only auto-play if we're not already playing something from this conversation
          if (currentlyPlayingConversationId !== conversation.conversationId) {
            console.log("🔔 New message received on home screen, autoplaying:", newestUnheard.messageId);
            playFromUri(newestUnheard.audioUrl, conversation.conversationId);
            updateLastRead(conversation.conversationId, profile.uid);
          }
        }
      }

      lastMessageCountsRef.current[conversation.conversationId] = currentCount;
    });
  }, [conversations.map(c => `${c.conversationId}:${c.messages.length}`).join(','), autoplay, profile?.uid]);


  // Clear currently playing conversation when playback stops
  useEffect(() => {
    if (!playerStatus.playing && currentlyPlayingConversationId) {
      setCurrentlyPlayingConversationId(null);
    }
  }, [playerStatus.playing, currentlyPlayingConversationId]);

  const playFromUri = async (uri: string, conversationId?: string) => {
    try {
      const docDir = documentDirectory;
      if (!docDir) {
        console.error("Error playing audio: Document directory is undefined");
        return;
      }

      const downloadResumable = createDownloadResumable(
        uri,
        docDir + "notification.mp4",
        {}
      );

      const newFile = await downloadResumable.downloadAsync();
      if (newFile) {
        audioPlayer.replace(newFile.uri);
        audioPlayer.play();
        if (conversationId) {
          setCurrentlyPlayingConversationId(conversationId);
        }
      }
    } catch (error) {
      console.error("Error playing audio from URI:", error);
    }
  };

  useEffect(() => {
    const onForeground = (event: NotificationWillDisplayEvent) => {
      const data = event.notification.additionalData as any;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);

        playFromUri(data.messageUrl, data.conversationId);
        updateLastRead(data.conversationId, profile!.uid);
      }
    };

    const onClick = (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as any;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);

        playFromUri(data.messageUrl, data.conversationId);

        updateLastRead(data.conversationId, profile!.uid);
      }
    };

    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      onForeground
    );

    OneSignal.Notifications.addEventListener("click", onClick);

    return () => {
      OneSignal.Notifications.removeEventListener(
        "foregroundWillDisplay",
        onForeground
      );
      OneSignal.Notifications.removeEventListener("click", onClick);
    };
  }, []);

  const handleAcceptFriendRequest = async (
    request: FriendRequest,
    requesterProfile: Profile
  ) => {
    if (!profile) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsScreen.tsx:322',message:'handleAcceptFriendRequest called',data:{requestId:request.id,requesterId:requesterProfile.uid,profileId:profile.uid,currentConversationsCount:conversations.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    try {
      // Accept the friend request
      const result = await acceptFriendRequest(request.id);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsScreen.tsx:327',message:'acceptFriendRequest result',data:{success:result.success,error:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to accept friend request");
        return;
      }

      // No conversation is created automatically - users can start conversations via the "To:" dropdown
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsScreen.tsx:348',message:'friend request accepted, no conversation created',data:{requesterUid:requesterProfile.uid,accepterUid:profile.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Refresh friend requests list
      getFriendRequests();
      // Refresh friends list
      getFriends();
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConversationsScreen.tsx:392',message:'error in handleAcceptFriendRequest',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    const result = await rejectFriendRequest(requestId);
    if (result.success) {
      getFriendRequests();
    } else {
      Alert.alert("Error", result.error || "Failed to decline friend request");
    }
  };

  const renderFriendRequest = (
    request: FriendRequest,
    requesterProfile: Profile
  ) => {
    return (
      <View style={styles.friendRequestContainer}>
        <Image
          style={styles.friendRequestProfilePicture}
          source={{ uri: requesterProfile.profilePicture }}
        />
        <View style={styles.friendRequestTextContainer}>
          <Text style={styles.friendRequestName}>{requesterProfile.name}</Text>
          <Text style={styles.friendRequestLabel}>Friend Request</Text>
        </View>
        <View style={styles.friendRequestButtons}>
          <TouchableOpacity
            style={[styles.friendRequestButton, styles.acceptButton]}
            onPress={() => handleAcceptFriendRequest(request, requesterProfile)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.friendRequestButton, styles.declineButton]}
            onPress={() => handleDeclineFriendRequest(request.id)}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getStatusIndicator = (conversation: Conversation) => {
    // Simple status logic: green if recent message, red if old, gray if no messages
    const lastMessage = lastMessageFromOtherUser(conversation);
    if (!lastMessage) {
      return { icon: "question", color: "#808080" };
    }
    const hoursSinceLastMessage = (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastMessage < 24) {
      return { icon: "check", color: "#4CAF50" };
    } else {
      return { icon: "close", color: "#F44336" };
    }
  };

  const renderConversation = (conversation: Conversation) => {
    const uid: string = conversation.uids.filter(
      (id) => id !== profile?.uid
    )[0];
    const otherProfile = profiles.find((p) => p.uid === uid);

    const isSelected = selectedConversation === conversation.conversationId;
    const status = getStatusIndicator(conversation);

    if (otherProfile) {
      return (
        <TouchableOpacity
          style={
            isSelected
              ? styles.selectedConversationContainer
              : styles.conversationContainer
          }
          onPress={() => {
            setSelectedConversation(conversation.conversationId);
            const lastMessage = lastMessageFromOtherUser(conversation);

            // Play the last message from the other user when tapping the conversation
            if (lastMessage) {
              playFromUri(lastMessage.audioUrl, conversation.conversationId);
              const lastRead = conversation.lastRead.filter(
                (l) => l.uid === profile?.uid
              )[0];
              // Update last read if this message hasn't been read yet
              if (!lastRead || isBefore(lastRead.timestamp, lastMessage.timestamp)) {
                updateLastRead(conversation.conversationId, profile!.uid);
              }
            }
          }}
          onLongPress={() =>
            (navigation as any).navigate("Conversation", {
              conversationId: conversation.conversationId,
            })
          }
        >
          <View style={styles.statusIndicator}>
            <View style={[styles.statusCircle, { backgroundColor: status.color }]}>
              <FontAwesome
                name={status.icon}
                style={styles.statusIcon}
              />
            </View>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.profileName}>
              {otherProfile.name}
            </Text>
            <View style={styles.timestampContainer}>
              <Text style={styles.lastMessage}>
                {conversation.messages.length === 0 
                  ? "New conversation" 
                  : formatDate(lastMessageTimestamp(conversation))}
              </Text>
              {conversation.messages.length > 0 && (
                <FontAwesome name="paper-plane" style={styles.paperPlaneIcon} />
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              (navigation as any).navigate("Conversation", {
                conversationId: conversation.conversationId,
              })
            }
          >
            <Entypo name="chat" style={styles.targetIcon} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    } else {
      return <View />;
    }
  };

  const renderItem = ({ item }: { item: ConversationListItem }) => {
    if (item.type === "friendRequest") {
      return renderFriendRequest(item.data, item.requesterProfile);
    } else {
      return renderConversation(item.data);
    }
  };

  return (
    <FlatList
      data={sortedListItems}
      renderItem={renderItem}
      style={styles.container}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      keyExtractor={(item, index) => {
        if (item.type === "friendRequest") {
          return `friendRequest-${item.data.id}`;
        } else {
          return `conversation-${item.data.conversationId}`;
        }
      }}
    />
  );
};

export default ConversationsScreen;

const formatDate = (timestamp: Date) => {
  if (isToday(timestamp)) {
    return format(timestamp, "h:mm a");
  } else if (isYesterday(timestamp)) {
    return format(timestamp, "h:mm a");
  } else if (isThisWeek(timestamp)) {
    return format(timestamp, "h:mm a");
  } else {
    return format(timestamp, "h:mm a");
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  separator: {
    width: "98%",
    borderBottomWidth: 0.5,
    borderBottomColor: "darkgrey",
    alignSelf: "center",
  },
  conversationContainer: {
    width: "100%",
    height: 90,
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  selectedConversationContainer: {
    width: "100%",
    height: 90,
    flexDirection: "row",
    backgroundColor: "#FFF9C4",
    paddingHorizontal: 15,
    paddingVertical: 15,
    alignItems: "center",
  },
  statusIndicator: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIcon: {
    fontSize: 12,
    color: "#FFF",
  },
  textContainer: {
    flex: 1,
    marginLeft: 5,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    color: "gray",
    marginRight: 6,
  },
  paperPlaneIcon: {
    fontSize: 12,
    color: "gray",
  },
  button: {
    width: 75,
    height: 75,
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    right: 0,
  },
  targetIcon: {
    fontSize: 24,
    color: "#666",
  },
  friendRequestContainer: {
    width: "100%",
    height: 90,
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    borderLeftWidth: 3,
    borderLeftColor: "#4A90E2",
  },
  friendRequestProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendRequestTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  friendRequestName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  friendRequestLabel: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  friendRequestButtons: {
    flexDirection: "row",
    gap: 8,
  },
  friendRequestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#000",
  },
  acceptButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  declineButton: {
    backgroundColor: "#F0F0F0",
  },
  declineButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },
});
