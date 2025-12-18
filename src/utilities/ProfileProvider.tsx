import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./Supabase";
import { View } from "react-native";
import Profile from "@objects/Profile";
import { handleError } from "./errorHandler";
import { logAgentEvent } from "./AgentLogger";
import { initializeOneSignal } from "./Onesignal";

const ProfileContext = createContext<{
  appReady: boolean;
  user: User | null;
  viewProfile: boolean;
  setViewProfile: React.Dispatch<React.SetStateAction<boolean>>;
  profile: Profile | null;
  saveProfile: (profile: Profile) => Promise<void>;
  getProfile: () => void;
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
    logAgentEvent({
      location: 'ProfileProvider.tsx:getProfile',
      message: 'getProfile called',
      data: { hasUser: !!user, userId: user?.id },
      hypothesisId: 'A',
    });

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
        logAgentEvent({
          location: 'ProfileProvider.tsx:getProfile:result',
          message: 'getProfile result',
          data: {
            hasData: !!data,
            hasError: !!error,
            error: error?.message || null,
            conversationIds: data?.[0]?.conversations || [],
            conversationIdsCount: data?.[0]?.conversations?.length || 0,
          },
          hypothesisId: 'A',
        });
        if (error) {
          handleError(error, "ProfileProvider.getProfile");
          setProfile(null);
          return;
        }
        
        if (data && data[0]) {
          try {
            const profile = Profile.fromJSON(data[0]);
            setProfile(profile);
          } catch (err: unknown) {
            handleError(err, "ProfileProvider.getProfile - parsing");
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
          const newConversations = (payload.new && typeof payload.new === 'object' && 'conversations' in payload.new && Array.isArray(payload.new.conversations))
            ? payload.new.conversations
            : [];
          const oldConversations = (payload.old && typeof payload.old === 'object' && 'conversations' in payload.old && Array.isArray(payload.old.conversations))
            ? payload.old.conversations
            : [];
          logAgentEvent({
            location: 'ProfileProvider.tsx:realtime',
            message: 'profile real-time update received',
            data: { eventType: payload.eventType, userId: user.id, newConversations, oldConversations },
            hypothesisId: 'D',
          });

          await supabase
            .from("profiles")
            .select("*")
            .eq("uid", user.id)
            .then(({ data, error }) => {
              logAgentEvent({
                location: 'ProfileProvider.tsx:realtime:refresh',
                message: 'profile refreshed after real-time update',
                data: {
                  hasData: !!data,
                  conversationIds: data?.[0]?.conversations || [],
                  conversationCount: data?.[0]?.conversations?.length || 0,
                  eventType: payload.eventType,
                },
                hypothesisId: 'D',
              });
              if (data && data[0]) {
                const newProfile = Profile.fromJSON(data[0]);
                setProfile(newProfile);
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

    // Initialize OneSignal when user is authenticated
    if (user?.id) {
      console.log('🔔 Attempting OneSignal initialization for user:', user.id);
      initializeOneSignal(user.id)
        .then(() => {
          console.log('✅ OneSignal initialization complete');
        })
        .catch((error) => {
          console.error('❌ OneSignal initialization failed:', error);
          handleError(error, 'ProfileProvider - OneSignal initialization');
        });
    }
  }, [user]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppReady(true);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [profile]);

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
      handleError(error, "ProfileProvider.saveProfile");
    }
  };

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
