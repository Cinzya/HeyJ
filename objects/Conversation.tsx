import { supabase } from "../utilities/Supabase";
import Message from "./Message";
import { sortBy } from "lodash";

export default class Conversation {
  conversationId: string;
  uids: string[];
  messages: Message[];
  lastRead: { uid: string; timestamp: Date }[];

  constructor(
    conversationId: string,
    uids: string[],
    messages: Message[],
    lastRead: { uid: string; timestamp: Date }[]
  ) {
    this.conversationId = conversationId;
    this.uids = uids;
    this.messages = messages;
    this.lastRead = lastRead;
  }

  toJSON() {
    const messageIds = this.messages.map((m) => m.messageId);
    return {
      uids: this.uids,
      conversationId: this.conversationId,
      messages: messageIds,
      lastRead: this.lastRead,
    };
  }

  static async fromJSON(data: any) {
    let messages: Message[] = [];

    await Promise.all(
      (data.messages as string[]).map(async (id) => {
        try {
          const { data: messageData, error } = await supabase
            .from("messages")
            .select()
            .eq("messageId", id);

          if (messageData) {
            messages.push(Message.fromJSON(messageData[0]));
          }
        } catch (error) {
          console.error("Error fetching message:", error);
        }
      })
    );

    return new Conversation(
      data.conversationId,
      data.uids,
      sortBy(messages, (m) => m.timestamp),
      data.lastRead
    );
  }
}
