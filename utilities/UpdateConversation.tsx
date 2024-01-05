import Conversation from "../objects/Conversation";
import { supabase } from "./Supabase";

export const updateLastRead = async (
  conversationId: string,
  currentUid: string
) => {
  const { data: conversationData } = await supabase
    .from("conversations")
    .select()
    .eq("conversationId", conversationId);

  if (conversationData && conversationData[0]) {
    const conversation = await Conversation.fromJSON(conversationData[0]);
    const newLastRead = [
      conversation.lastRead.filter((l) => l.uid !== currentUid)[0],
      { uid: currentUid, timestamp: new Date() },
    ];
    const newConversation = {
      conversationId: conversation.conversationId,
      lastRead: newLastRead,
    };

    await supabase.from("conversations").upsert(newConversation);
  }
};
