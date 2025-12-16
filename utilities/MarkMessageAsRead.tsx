import { supabase } from "./Supabase";

export const markMessageAsRead = async (messageId: string) => {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ isRead: true })
      .eq("messageId", messageId);

    if (error) {
      console.error("Error marking message as read:", error);
    }
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
};

