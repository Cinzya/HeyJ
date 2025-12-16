import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./Supabase";
import { View } from "react-native";
import Profile from "../objects/Profile";
import Conversation from "../objects/Conversation";
import FriendRequest from "../objects/FriendRequest";

const ProfileContext = createContext<{
  appReady: boolean;
  user: User | null;
  viewProfile: boolean;
  setViewProfile: React.Dispatch<React.SetStateAction<boolean>>;
  profile: Profile | null;
  saveProfile: (profile: Profile) => Promise<void>;
  getProfile: () => void;
  conversations: Conversation[];
  profiles: Profile[];
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
} | null>(null);

const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [appReady, setAppReady] = useState(false);

  const [user, setUser] = useState<User | null>({
    id: "",
    app_metadata: {},
    user_metadata: {},
    aud: "",
    created_at: "",
  });
  const [viewProfile, setViewProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener.subscription;
    };
  }, []);

  const [profile, setProfile] = useState<Profile | null>(null);

  const getProfile = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:61',message:'getProfile called',data:{hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!user) {
      setProfile(null);
      return;
    }

    const { id } = user;

    supabase
      .from("profiles")
      .select("*")
      .eq("uid", id)
      .then(({ data, error }) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:73',message:'getProfile result',data:{hasData:!!data,hasError:!!error,error:error?.message||null,conversationIds:data?.[0]?.conversations||[],conversationIdsCount:data?.[0]?.conversations?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (error) {
          console.error("Error fetching profile:", error);
          setProfile(null);
          return;
        }
        
        if (data && data[0]) {
          try {
            const profile = Profile.fromJSON(data[0]);
            setProfile(profile);
          } catch (err: unknown) {
            console.error("Error parsing profile:", err);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      });
  };

  const updateProfile = () => {
    if (!user) {
      return;
    }

    const channel = supabase.channel(user.id + "_profile");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: "uid=eq." + user.id,
        },
        async (payload) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:116',message:'profile real-time update received',data:{eventType:payload.eventType,userId:user.id,newConversations:payload.new?.conversations||[],oldConversations:payload.old?.conversations||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          await supabase
            .from("profiles")
            .select("*")
            .eq("uid", user.id)
            .then(({ data, error }) => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:121',message:'profile refreshed after real-time update',data:{hasData:!!data,conversationIds:data?.[0]?.conversations||[],conversationCount:data?.[0]?.conversations?.length||0,eventType:payload.eventType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
              if (data && data[0]) {
                const newProfile = Profile.fromJSON(data[0]);
                const oldConversationIds = profile?.conversations || [];
                const newConversationIds = newProfile.conversations || [];
                
                // Check if a new conversation was added
                const hasNewConversation = newConversationIds.some(id => !oldConversationIds.includes(id));
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:130',message:'profile updated via real-time',data:{oldConversationCount:oldConversationIds.length,newConversationCount:newConversationIds.length,hasNewConversation,newConversationIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                
                setProfile(newProfile);
                // getConversations will be called automatically via useEffect when profile changes
                // updateConversations will also be called automatically via useEffect when profile changes
                
                // If a new conversation was added, explicitly fetch conversations to ensure it appears
                if (hasNewConversation && newConversationIds.length > 0) {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:141',message:'new conversation detected, will fetch via useEffect',data:{newConversationIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                  // #endregion
                }
              } else {
                setProfile(null);
              }
            });
        }
      )
      .subscribe();
  };

  useEffect(() => {
    updateProfile();
    // Push notifications disabled for testing
  }, [user]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppReady(true);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [profile]);

  // useEffect(() => {
  //   getProfile();
  // }, []);

  useEffect(() => {
    getProfile();
  }, [user]);

  const saveProfile = async (profile: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .upsert(profile.toJSONWithoutConversations());

    if (!error) {
      getProfile();
    } else {
      console.error("Error saving profile:", error);
    }
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const getConversations = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:165',message:'getConversations called',data:{hasProfile:!!profile,profileConversations:profile?.conversations||[],conversationIdsCount:profile?.conversations?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!profile || !profile.conversations || profile.conversations.length === 0) {
      setConversations([]);
      return;
    }

    let conversations: Conversation[] = [];

    await Promise.all(
      profile.conversations.map(async (id: string) => {
        try {
          const { data: conversationData, error } = await supabase
            .from("conversations")
            .select()
            .eq("conversationId", id);

          if (conversationData && conversationData[0]) {
            conversations.push(
              await Conversation.fromJSON(conversationData[0])
            );
          }
        } catch (error) {
          console.error("Error fetching conversation:", error);
        }
      })
    );
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:192',message:'getConversations completed',data:{fetchedCount:conversations.length,conversationIds:conversations.map(c=>c.conversationId),messageCounts:conversations.map(c=>({id:c.conversationId,count:c.messages.length}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    setConversations(conversations);
  };

  useEffect(() => {
    if (profile) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:213',message:'profile changed, calling getConversations',data:{profileUid:profile.uid,conversationIds:profile.conversations||[],conversationCount:profile.conversations?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      getConversations();
    }
  }, [profile]);

  const conversationChannelsRef = useRef<Map<string, any>>(new Map());

  const updateConversations = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:220',message:'updateConversations called',data:{hasProfile:!!profile,conversationIds:profile?.conversations||[],conversationCount:profile?.conversations?.length||0,existingSubscriptions:Array.from(conversationChannelsRef.current.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!profile || !profile.conversations || profile.conversations.length === 0) {
      // Clean up all subscriptions if no conversations
      conversationChannelsRef.current.forEach((channel, id) => {
        supabase.removeChannel(channel);
        conversationChannelsRef.current.delete(id);
      });
      return;
    }

    // Remove subscriptions for conversations that are no longer in the profile
    const currentConversationIds = new Set(profile.conversations);
    conversationChannelsRef.current.forEach((channel, id) => {
      if (!currentConversationIds.has(id)) {
        supabase.removeChannel(channel);
        conversationChannelsRef.current.delete(id);
      }
    });

    // Add subscriptions for new conversations
    profile.conversations.forEach((id: string) => {
      // Skip if subscription already exists
      if (conversationChannelsRef.current.has(id)) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:245',message:'subscription already exists for conversation',data:{conversationId:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:249',message:'setting up subscription for new conversation',data:{conversationId:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      try {
        const channel = supabase.channel(id + "_conversation");

        channel
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "conversations",
              filter: "conversationId=eq." + id,
            },
            async (payload) => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:236',message:'conversation real-time update received',data:{conversationId:id,eventType:payload.eventType,newMessages:payload.new?.messages?.length||0,oldMessages:payload.old?.messages?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              // #endregion
              const { data: conversationData, error } = await supabase
                .from("conversations")
                .select()
                .eq("conversationId", id);

              if (conversationData && conversationData[0]) {
                const updatedConversation = await Conversation.fromJSON(
                  conversationData[0]
                );
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:243',message:'conversation updated locally',data:{conversationId:id,messageCount:updatedConversation.messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion

                setConversations((prevConversations) => {
                  const existing = prevConversations.find(c => c.conversationId === id);
                  if (!existing) {
                    // New conversation, add it
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:253',message:'adding new conversation from real-time update',data:{conversationId:id,messageCount:updatedConversation.messages.length,previousConversationsCount:prevConversations.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion
                    return [...prevConversations, updatedConversation];
                  }
                  // Update existing conversation
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:260',message:'updating existing conversation from real-time update',data:{conversationId:id,oldMessageCount:existing.messages.length,newMessageCount:updatedConversation.messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                  // #endregion
                  return prevConversations.map((c) =>
                    c.conversationId === id ? updatedConversation : c
                  );
                });
              }
            }
          )
                  .subscribe((status) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:261',message:'conversation subscription status',data:{conversationId:id,status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion
                    if (status === "SUBSCRIBED") {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileProvider.tsx:264',message:'conversation subscription active',data:{conversationId:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                      // #endregion
                    }
                  });
        
        conversationChannelsRef.current.set(id, channel);
      } catch (error) {
        console.error("Error setting up conversation subscription:", error);
      }
    });
  };

  useEffect(() => {
    if (profile) {
      updateConversations();
    }
    
    // Cleanup on unmount
    return () => {
      conversationChannelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      conversationChannelsRef.current.clear();
    };
  }, [profile]);

  const [profiles, setProfiles] = useState<Profile[]>([]);

  const getProfiles = async () => {
    if (!conversations || conversations.length === 0) {
      setProfiles([]);
      return;
    }

    let profiles: Profile[] = [];

    await Promise.all(
      conversations.map(async (c) => {
        const uid = c.uids.filter((id) => id !== profile?.uid)[0];

        if (!uid) {
          return;
        }

        try {
          const { data, error } = await supabase
            .from("profiles")
            .select()
            .eq("uid", uid);

          if (data && data[0]) {
            profiles.push(Profile.fromJSON(data[0]));
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      })
    );

    setProfiles(profiles);
  };

  useEffect(() => {
    getProfiles();
  }, [conversations]);

  // Friend Requests State
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

  if (!appReady) {
    return <View />;
  }

  return (
    <ProfileContext.Provider
      value={{
        appReady,
        user,
        viewProfile,
        setViewProfile,
        profile,
        saveProfile,
        getProfile,
        conversations,
        profiles,
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
      <View style={{ flex: 1 }}>{children}</View>
    </ProfileContext.Provider>
  );
};

const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};

export { ProfileProvider, useProfile };
