import { useEffect, useState } from "react";
import { groupBy, sortBy } from "lodash";
import { isToday } from "date-fns";
import Conversation from "../objects/Conversation";
import Message from "../objects/Message";
import Profile from "../objects/Profile";
import { formatDate } from "../utilities/dateUtils";
import { useConversations } from "../utilities/ConversationsProvider";
import { useProfile } from "../utilities/ProfileProvider";

export const useConversationMessages = (conversationId: string) => {
  const { profile } = useProfile();
  const { conversations, profiles } = useConversations();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sortedMessages, setSortedMessages] = useState<
    { title: string; data: Message[] }[]
  >([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const conversation = conversations.find(
      (c) => c.conversationId === conversationId
    );
    const uid = conversation?.uids.filter((id) => id !== profile?.uid)[0];
    const otherProfile = profiles.find((p) => p.uid === uid);

    if (conversation && otherProfile) {
      const newMessages = sortBy(conversation.messages, (m) => m.timestamp);
      const groupedMessages = Object.values(
        groupBy(newMessages, (m) => formatDate(m.timestamp))
      );

      const today = groupedMessages.filter((m) => isToday(m[0].timestamp));

      const sorted = [
        ...groupedMessages.filter((m) => !isToday(m[0].timestamp)),
        ...today,
      ].map((group) => {
        const lastTime = formatDate(group[0].timestamp);

        return { title: lastTime, data: group };
      });

      setConversation(conversation);
      setSortedMessages(sorted);
      setOtherProfile(otherProfile);
    }
  }, [conversationId, conversations, profile, profiles]);

  return { conversation, sortedMessages, otherProfile };
};

