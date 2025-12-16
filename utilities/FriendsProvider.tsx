import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./Supabase";
import FriendRequest from "../objects/FriendRequest";
import Profile from "../objects/Profile";
import { useProfile } from "./ProfileProvider";

interface FriendsContextType {
  friendRequests: FriendRequest[];
  friends: Profile[];
  getFriendRequests: () => Promise<void>;
  getFriends: () => Promise<void>;
  sendFriendRequest: (userCode: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  rejectFriendRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  blockUser: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  cancelFriendRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  checkFriendshipStatus: (otherUserId: string) => Promise<"accepted" | "pending" | "rejected" | "blocked" | "none">;
}

const FriendsContext = createContext<FriendsContextType | null>(null);

export const FriendsProvider = ({ children }: { children: React.ReactNode }) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FriendsProvider.tsx:22',message:'FriendsProvider rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  let profile;
  try {
    const profileContext = useProfile();
    profile = profileContext.profile;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FriendsProvider.tsx:27',message:'FriendsProvider useProfile success',data:{hasProfile:!!profile},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FriendsProvider.tsx:30',message:'FriendsProvider useProfile error',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw error;
  }
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);

  const getFriendRequests = async () => {
    if (!profile) {
      setFriendRequests([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${profile.uid},addressee_id.eq.${profile.uid}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching friend requests:", error);
        setFriendRequests([]);
        return;
      }

      if (data) {
        const requests = data.map((r) => FriendRequest.fromJSON(r));
        setFriendRequests(requests);
      } else {
        setFriendRequests([]);
      }
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      setFriendRequests([]);
    }
  };

  const getFriends = async () => {
    if (!profile) {
      setFriends([]);
      return;
    }

    try {
      // Get accepted friendships where user is either requester or addressee
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${profile.uid},addressee_id.eq.${profile.uid}`);

      if (error) {
        console.error("Error fetching friends:", error);
        setFriends([]);
        return;
      }

      if (data && data.length > 0) {
        // Get the other user's UID for each friendship
        const friendUids = data.map((f) =>
          f.requester_id === profile.uid ? f.addressee_id : f.requester_id
        );

        // Fetch profiles for all friend UIDs
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("uid", friendUids);

        if (profilesError) {
          console.error("Error fetching friend profiles:", profilesError);
          setFriends([]);
          return;
        }

        if (profilesData) {
          const friendProfiles = profilesData.map((p) => Profile.fromJSON(p));
          setFriends(friendProfiles);
        } else {
          setFriends([]);
        }
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
      setFriends([]);
    }
  };

  const sendFriendRequest = async (
    userCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      // Find user by userCode
      const trimmedCode = userCode.trim().toLowerCase();
      const { data: allProfiles, error: fetchError } = await supabase
        .from("profiles")
        .select("uid,userCode,name");

      if (fetchError) {
        return { success: false, error: "Failed to search for user" };
      }

      const foundUser = allProfiles?.find(
        (p) => p.userCode?.trim().toLowerCase() === trimmedCode
      );

      if (!foundUser) {
        return { success: false, error: "User not found" };
      }

      if (foundUser.uid === profile.uid) {
        return { success: false, error: "You cannot add yourself as a friend" };
      }

      // Check if already blocked (user blocked them, or they blocked user)
      const { data: existingBlocks, error: blockCheckError } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "blocked")
        .or(
          `and(requester_id.eq.${foundUser.uid},addressee_id.eq.${profile.uid}),and(requester_id.eq.${profile.uid},addressee_id.eq.${foundUser.uid})`
        );

      if (existingBlocks && existingBlocks.length > 0) {
        // Check if the other user blocked us (they are requester and we are addressee)
        const theyBlockedUs = existingBlocks.some(
          (block) =>
            block.requester_id === foundUser.uid &&
            block.addressee_id === profile.uid
        );
        if (theyBlockedUs) {
          return {
            success: false,
            error: "You cannot send a friend request to this user",
          };
        }
      }

      // Check if request already exists
      const { data: existingRequests, error: requestCheckError } =
        await supabase
          .from("friendships")
          .select("*")
          .or(
            `and(requester_id.eq.${profile.uid},addressee_id.eq.${foundUser.uid}),and(requester_id.eq.${foundUser.uid},addressee_id.eq.${profile.uid})`
          )
          .limit(1);

      if (existingRequests && existingRequests.length > 0) {
        const existingRequest = existingRequests[0];
        if (existingRequest.status === "accepted") {
          return { success: false, error: "You are already friends" };
        }
        if (existingRequest.status === "pending") {
          return {
            success: false,
            error: "Friend request already sent or received",
          };
        }
        // If rejected, update to pending
        if (existingRequest.status === "rejected") {
          const { error: updateError } = await supabase
            .from("friendships")
            .update({
              status: "pending",
              requester_id: profile.uid,
              addressee_id: foundUser.uid,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRequest.id);

          if (updateError) {
            return { success: false, error: "Failed to send friend request" };
          }

          await getFriendRequests();
          return { success: true };
        }
      }

      // Create new friend request
      const { error: insertError } = await supabase
        .from("friendships")
        .insert({
          requester_id: profile.uid,
          addressee_id: foundUser.uid,
          status: "pending",
        });

      if (insertError) {
        if (insertError.code === "23505") {
          // Unique constraint violation
          return {
            success: false,
            error: "Friend request already exists",
          };
        }
        return { success: false, error: "Failed to send friend request" };
      }

      await getFriendRequests();
      return { success: true };
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to send friend request",
      };
    }
  };

  const acceptFriendRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      const { error } = await supabase
        .from("friendships")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("addressee_id", profile.uid);

      if (error) {
        return { success: false, error: "Failed to accept friend request" };
      }

      await getFriendRequests();
      await getFriends();
      return { success: true };
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to accept friend request",
      };
    }
  };

  const rejectFriendRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      const { error } = await supabase
        .from("friendships")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("addressee_id", profile.uid);

      if (error) {
        return { success: false, error: "Failed to reject friend request" };
      }

      await getFriendRequests();
      return { success: true };
    } catch (error: any) {
      console.error("Error rejecting friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to reject friend request",
      };
    }
  };

  const blockUser = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      // Get the request to find the other user
      const { data: request, error: fetchError } = await supabase
        .from("friendships")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError || !request) {
        return { success: false, error: "Friend request not found" };
      }

      const otherUserId =
        request.requester_id === profile.uid
          ? request.addressee_id
          : request.requester_id;

      // Update or create blocked status
      const { error: updateError } = await supabase
        .from("friendships")
        .upsert(
          {
            requester_id: otherUserId,
            addressee_id: profile.uid,
            status: "blocked",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "requester_id,addressee_id",
          }
        );

      if (updateError) {
        return { success: false, error: "Failed to block user" };
      }

      await getFriendRequests();
      return { success: true };
    } catch (error: any) {
      console.error("Error blocking user:", error);
      return {
        success: false,
        error: error.message || "Failed to block user",
      };
    }
  };

  const cancelFriendRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: "No profile found" };
    }

    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", requestId)
        .eq("requester_id", profile.uid);

      if (error) {
        return { success: false, error: "Failed to cancel friend request" };
      }

      await getFriendRequests();
      return { success: true };
    } catch (error: any) {
      console.error("Error canceling friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to cancel friend request",
      };
    }
  };

  const checkFriendshipStatus = async (
    otherUserId: string
  ): Promise<"accepted" | "pending" | "rejected" | "blocked" | "none"> => {
    if (!profile) {
      return "none";
    }

    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(
          `and(requester_id.eq.${profile.uid},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${profile.uid})`
        )
        .limit(1);

      if (error || !data || data.length === 0) {
        return "none";
      }

      return data[0].status as "accepted" | "pending" | "rejected" | "blocked";
    } catch (error) {
      console.error("Error checking friendship status:", error);
      return "none";
    }
  };

  useEffect(() => {
    if (profile) {
      getFriendRequests();
      getFriends();
    }
  }, [profile]);

  // Real-time subscription for friend requests
  useEffect(() => {
    if (!profile) {
      return;
    }

    const channel = supabase.channel(`friendships_${profile.uid}`, {
      config: {
        broadcast: { self: true },
      },
    });

    // Listen for new friend requests (INSERT) where user is addressee
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${profile.uid}`,
        },
        (payload) => {
          console.log("🔔 New friend request received!", payload);
          getFriendRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${profile.uid}`,
        },
        (payload) => {
          console.log("🔔 Friend request sent!", payload);
          getFriendRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${profile.uid}`,
        },
        (payload) => {
          console.log("🔔 Friend request updated!", payload);
          getFriendRequests();
          getFriends();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${profile.uid}`,
        },
        (payload) => {
          console.log("🔔 Friend request status changed!", payload);
          getFriendRequests();
          getFriends();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${profile.uid}`,
        },
        (payload) => {
          console.log("🔔 Friend request deleted!", payload);
          getFriendRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${profile.uid}`,
        },
        (payload) => {
          console.log("🔔 Friend request cancelled!", payload);
          getFriendRequests();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Friend requests real-time subscription active");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Friend requests subscription error");
        } else {
          console.log("🔄 Friend requests subscription status:", status);
        }
      });

    return () => {
      console.log("🔌 Unsubscribing from friend requests channel");
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return (
    <FriendsContext.Provider
      value={{
        friendRequests,
        friends,
        getFriendRequests,
        getFriends,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        blockUser,
        cancelFriendRequest,
        checkFriendshipStatus,
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
};

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error("useFriends must be used within a FriendsProvider");
  }
  return context;
};

