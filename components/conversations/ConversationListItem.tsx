import React from "react";
import { View } from "react-native";
import ConversationItem from "./ConversationItem";
import FriendRequestItem from "./FriendRequestItem";
import { getOtherUserUid } from "../../utilities/conversationUtils";
import Profile from "../../objects/Profile";
import FriendRequest from "../../objects/FriendRequest";
import { ConversationListItem } from "../../stores/useConversationListStore";

interface ConversationListItemProps {
    item: ConversationListItem;
    profiles: Profile[];
    currentUserProfile: Profile | null;
    selectedConversation: string | null;
    onSelect: (conversationId: string) => void;
    onNavigate: (conversationId: string) => void;
    playFromUri: (uri: string) => void;
    audioPlayer: any;
    // Friend request handlers
    acceptFriendRequest?: (requestId: string) => Promise<{ success: boolean; error?: string }>;
    getFriendRequests?: () => Promise<void>;
    getFriends?: () => Promise<void>;
    handleAccept?: (
        request: FriendRequest,
        requesterProfile: Profile,
        acceptFriendRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>,
        getFriendRequests: () => Promise<void>,
        getFriends: () => Promise<void>
    ) => Promise<void>;
    handleDecline?: (
        requestId: string,
        rejectFriendRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>,
        getFriendRequests: () => Promise<void>
    ) => Promise<void>;
    rejectFriendRequest?: (requestId: string) => Promise<{ success: boolean; error?: string }>;
}






const ConversationListItemComponent: React.FC<ConversationListItemProps> = (props) => {
    const {
        item,
        profiles,
        currentUserProfile,
        selectedConversation,
        onSelect,
        onNavigate,
        playFromUri,
        audioPlayer,
        // Friend request handlers
        acceptFriendRequest,
        getFriendRequests,
        getFriends,
        handleAccept,
        handleDecline,
        rejectFriendRequest,
    } = props;

    if (item.type === "friendRequest") {
        return (
            <FriendRequestItem
                request={item.data}
                requesterProfile={item.requesterProfile}
                onAccept={() => {
                    if (handleAccept && acceptFriendRequest && getFriendRequests && getFriends) {
                        handleAccept(
                            item.data,
                            item.requesterProfile,
                            acceptFriendRequest,
                            getFriendRequests,
                            getFriends
                        );
                    }
                }}
                onDecline={() => {
                    if (handleDecline && rejectFriendRequest && getFriendRequests) {
                        handleDecline(item.data.id, rejectFriendRequest, getFriendRequests);
                    }
                }}
            />
        );
    } else {
        if (!currentUserProfile) return <View />;

        const otherUserUid = getOtherUserUid(item.data, currentUserProfile.uid);
        if (!otherUserUid) return <View />;

        const otherProfile = profiles.find((p: Profile) => p.uid === otherUserUid);
        if (!otherProfile) return <View />;

        const isSelected = selectedConversation === item.data.conversationId;

        return (
            <ConversationItem
                conversation={item.data}
                currentUserProfile={currentUserProfile}
                otherProfile={otherProfile}
                isSelected={isSelected}
                onPress={() => onSelect(item.data.conversationId)}
                onLongPress={() => onNavigate(item.data.conversationId)}
                playFromUri={playFromUri}
                audioPlayer={audioPlayer}
            />
        );
    }
};

export default React.memo(ConversationListItemComponent);
