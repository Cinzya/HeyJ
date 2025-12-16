import { useState, useEffect } from "react";
import { supabase } from "../utilities/Supabase";
import Profile from "../objects/Profile";
import FriendRequest from "../objects/FriendRequest";

/**
 * Hook to fetch and manage requester profiles for friend requests
 * @param profile - Current user's profile
 * @param friendRequests - Array of friend requests
 * @returns Map of UID to Profile for requesters
 */
export const useRequesterProfiles = (
  profile: Profile | null,
  friendRequests: FriendRequest[]
): Map<string, Profile> => {
  const [requesterProfiles, setRequesterProfiles] = useState<
    Map<string, Profile>
  >(new Map());

  useEffect(() => {
    const fetchRequesterProfiles = async () => {
      if (!profile || friendRequests.length === 0) {
        setRequesterProfiles(new Map());
        return;
      }

      const profilesMap = new Map<string, Profile>();
      const uidsToFetch = new Set<string>();

      // Collect all unique UIDs we need to fetch
      friendRequests.forEach((request) => {
        if (request.requesterId !== profile.uid) {
          uidsToFetch.add(request.requesterId);
        }
        if (request.addresseeId !== profile.uid) {
          uidsToFetch.add(request.addresseeId);
        }
      });

      // Fetch all profiles at once
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("uid", Array.from(uidsToFetch));

      if (!error && data) {
        data.forEach((p) => {
          profilesMap.set(p.uid, Profile.fromJSON(p));
        });
      }

      setRequesterProfiles(profilesMap);
    };

    fetchRequesterProfiles();
  }, [friendRequests, profile]);

  return requesterProfiles;
};

/**
 * Hook to fetch requester profiles for incoming pending friend requests only
 * @param profile - Current user's profile
 * @param friendRequests - Array of friend requests
 * @returns Map of UID to Profile for incoming requesters
 */
export const useIncomingRequesterProfiles = (
  profile: Profile | null,
  friendRequests: FriendRequest[]
): Map<string, Profile> => {
  const [requesterProfilesMap, setRequesterProfilesMap] = useState<
    Map<string, Profile>
  >(new Map());

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

  return requesterProfilesMap;
};

