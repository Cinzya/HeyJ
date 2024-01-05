import { OneSignal } from "react-native-onesignal";
import { supabase } from "./Supabase";
import { User } from "@supabase/supabase-js";

const appId = "71e4ad50-8ec2-4b7b-a748-0985053b69a9";

OneSignal.initialize(appId);

export const removeToken = async (uid: string) => {
  try {
    const token = OneSignal.User.pushSubscription.getPushSubscriptionId();

    const { data: userData } = await supabase
      .from("push_tokens")
      .select()
      .eq("uid", uid);

    if (userData) {
      let tokens: string[] = userData[0]?.tokens || [];

      if (tokens.includes(token)) {
        const index = tokens.indexOf(token);
        tokens.splice(index, 1);

        const { data, error } = await supabase
          .from("push_tokens")
          .upsert({ uid: uid, tokens });
      }
    }
  } catch (error) {
    console.error("Error removing token:", error);
  }
};

const updateTokens = async (user: User, token: string) => {
  try {
    if (token) {
      const { data: userData } = await supabase
        .from("push_tokens")
        .select()
        .eq("uid", user.id);

      if (userData) {
        let tokens: string[] = userData[0]?.tokens || [];

        if (!tokens.includes(token)) {
          tokens.push(token);

          const { data } = await supabase
            .from("push_tokens")
            .upsert({ uid: user.id, tokens });
        }
      }
    }
  } catch (error) {
    console.error("Error updating tokens:", error);
  }
};

export async function registerForPushNotificationsAsync() {
  OneSignal.User.pushSubscription.addEventListener(
    "change",
    handleSubscriptionChange
  );

  if (!OneSignal.Notifications.hasPermission()) {
    const permission = await OneSignal.Notifications.requestPermission(true);
  } else {
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      const token = OneSignal.User.pushSubscription.getPushSubscriptionId();
      updateTokens(data.user, token);
    }
  }
}

const handleSubscriptionChange = async (event: any) => {
  try {
    const token = event.current.id;

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (user) {
      updateTokens(user, token);
    }

    supabase.auth.onAuthStateChange((authEvent, session) => {
      const authUser = session?.user;
      if (authEvent === "SIGNED_OUT") {
        return;
      } else if (authUser) {
        updateTokens(authUser, token);
      }
    });
  } catch (error) {
    console.error("Error handling subscription change:", error);
  }
};

export async function sendPushNotification(
  toUid: string,
  fromName: string,
  fromPhoto: string,
  conversationId: string,
  messageUrl: string
) {
  const { data: tokensData } = await supabase
    .from("push_tokens")
    .select()
    .eq("uid", toUid);

  if (tokensData && tokensData[0]) {
    const tokens = tokensData[0].tokens;

    try {
      const notification = {
        app_id: appId,
        include_subscription_ids: tokens,
        contents: {
          en: "Sent you a message",
        },
        headings: {
          en: fromName,
        },
        data: {
          name: fromName,
          url: fromPhoto,
          conversationId: conversationId,
          messageUrl: messageUrl,
        },
      };

      const response = await fetch(
        "https://onesignal.com/api/v1/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Basic MzcxOTRkYWMtMzY5MS00MWVmLTgxM2ItMmI4Njg2ZmJkMTUy`,
          },
          body: JSON.stringify(notification),
        }
      );
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }
}
