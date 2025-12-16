import {
  View,
  StyleSheet,
  Animated,
  Text,
  TouchableOpacity,
  Easing,
  DimensionValue,
  FlatList,
  useWindowDimensions,
  Image,
  Alert,
} from "react-native";
import {
  useAudioRecorder,
  RecordingOptions,
  AudioModule,
  RecordingPresets,
  useAudioRecorderState,
  setAudioModeAsync,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "../utilities/ProfileProvider";
import ConversationsScreen from "./ConversationsScreen";
import { sendMessage } from "../utilities/SendMessage";
import { useNavigation } from "@react-navigation/native";
import RecordingPanel from "../components/chat/RecordingPanel";
import Conversation from "../objects/Conversation";
import UUID from "react-native-uuid";
import { supabase } from "../utilities/Supabase";

const HomeScreen = () => {
  const navigation = useNavigation();
  const { profile, conversations, profiles, friends, getFriends, getProfile } = useProfile();

  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>("");

  const recordingOptions: RecordingOptions = {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      sampleRate: 44100,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 127,
      sampleRate: 44100,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  };


  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recordingAllowed, setRecordingAllowed] = useState("denied");
  const [loudness, setLoudness] = useState<Number[]>(
    Array.from({ length: 20 }, () => 15)
  );

  const animatedWidth = useRef(new Animated.Value(45)).current;
  const animatedHeight = useRef(new Animated.Value(45)).current;
  const animatedRadius = useRef(new Animated.Value(45)).current;

  const [width, setWidth] = useState(45);
  const [height, setHeight] = useState(45);
  const [radius, setRadius] = useState(45);

  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);

  useEffect(() => {
    if (profile && selectedConversation) {
      const conversation = conversations.find((c) => c.conversationId === selectedConversation);
      if (conversation) {
        const uid: string = conversation.uids.filter((id) => id !== profile?.uid)[0];
        const otherProfile = profiles.find((p) => p.uid === uid);
        setSelectedRecipientName(otherProfile?.name || "---");
        setSelectedFriendUid(uid);
      } else {
        setSelectedRecipientName("");
        setSelectedFriendUid(null);
      }
    } else {
      setSelectedRecipientName("");
      setSelectedFriendUid(null);
    }
  }, [profile, profiles, selectedConversation, conversations]);

  useEffect(() => {
    if (profile) {
      getFriends();
    }
  }, [profile]);

  useEffect(() => {
    navigation.addListener("blur", (event) => { });

    requestPermissions();

    const widthListener = animatedWidth.addListener(({ value }) =>
      setWidth(value)
    );
    const heightListener = animatedHeight.addListener(({ value }) =>
      setHeight(value)
    );
    const radiusListener = animatedRadius.addListener(({ value }) =>
      setRadius(value)
    );

    return () => {
      animatedWidth.removeListener(widthListener);
      animatedHeight.removeListener(heightListener);
      animatedRadius.removeListener(radiusListener);
    };
  }, []);

  const requestPermissions = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:129',message:'requestPermissions called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const response = await AudioModule.requestRecordingPermissionsAsync();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:133',message:'permissions response received',data:{status:response.status,granted:response.granted},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    setRecordingAllowed(response.status);
    
    // Enable recording on iOS after permissions are granted
    if (response.granted) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:138',message:'calling setAudioModeAsync with allowsRecording:true',data:{granted:response.granted},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:144',message:'setAudioModeAsync completed successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:147',message:'error calling setAudioModeAsync',data:{errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        console.error("Error setting audio mode:", error);
      }
    }
  };

  const startRecording = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:118',message:'startRecording called',data:{recordingAllowed,hasSelectedConversation:!!selectedConversation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,D'})}).catch(()=>{});
    // #endregion
    if (recordingAllowed !== "granted") {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:120',message:'permissions not granted, requesting',data:{recordingAllowed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      requestPermissions();
      return;
    }

    if (!selectedConversation) {
      alert("No conversation selected.");
      return;
    }

    try {
      // Ensure audio mode is set for recording (especially important on iOS)
      // This handles the case where RecordingPlayer may have set allowsRecording:false
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:179',message:'before prepareToRecordAsync - setting audio mode for recording',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C,E'})}).catch(()=>{});
      // #endregion
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:186',message:'audio mode set to allowsRecording:true before recording',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C,E'})}).catch(()=>{});
        // #endregion
        // Add a small delay to ensure audio mode takes effect on iOS
        await new Promise(resolve => setTimeout(resolve, 100));
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:189',message:'delay completed after setting audio mode',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:192',message:'error setting audio mode before recording',data:{errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C,E'})}).catch(()=>{});
        // #endregion
        console.error("Error setting audio mode for recording:", error);
      }
      
      console.log("🎤 Preparing to record...");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:197',message:'calling prepareToRecordAsync',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      await audioRecorder.prepareToRecordAsync();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:132',message:'after prepareToRecordAsync, before record()',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      console.log("🎤 Starting recording...");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:172',message:'calling audioRecorder.record()',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A,C,E'})}).catch(()=>{});
      // #endregion
      await audioRecorder.record();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:175',message:'after record() - success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A,C,E'})}).catch(()=>{});
      // #endregion
      console.log("✅ Recording started");

      const widthAnimation = Animated.timing(animatedWidth, {
        toValue: 30,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const heightAnimation = Animated.timing(animatedHeight, {
        toValue: 30,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const radiusAnimation = Animated.timing(animatedRadius, {
        toValue: 10,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const parallelAnimation = Animated.parallel([
        widthAnimation,
        heightAnimation,
        radiusAnimation,
      ]);

      parallelAnimation.start();
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:180',message:'error in startRecording',data:{errorMessage:error?.message,errorName:error?.name,errorString:String(error),stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A,C,E'})}).catch(()=>{});
      // #endregion
      console.error("❌ Error starting recording:", error);
    }
  };

  // Monitor recording metering for waveform visualization
  useEffect(() => {
    if (audioRecorder.isRecording) {
      const interval = setInterval(() => {
        // expo-audio doesn't expose metering directly yet
        // For now, we'll use a simulated waveform
        const randomLoudness = Math.random() * 60 + 15;
        setLoudness((prevLoudness) => [...prevLoudness.slice(-19), randomLoudness]);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [audioRecorder.isRecording]);

  const handleFriendSelected = async (friendUid: string) => {
    if (!profile) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:272',message:'handleFriendSelected called',data:{friendUid,currentUid:profile.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    try {
      // Use findOrCreateConversation to ensure we don't create duplicates
      const { findOrCreateConversation } = await import("../utilities/FindOrCreateConversation");
      const result = await findOrCreateConversation(profile.uid, friendUid);
      const conversation = result.conversation;
      const conversationId = conversation.conversationId;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:279',message:'findOrCreateConversation result',data:{conversationId,isNew:result.isNew,friendUid,currentUid:profile.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Get friend's profile to update
      const friend = friends.find((f) => f.uid === friendUid);
      if (!friend) {
        Alert.alert("Error", "Friend not found.");
        return;
      }

      // Fetch latest friend profile to ensure we have current conversations
      const { data: friendProfileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("uid", friendUid)
        .single();

      const otherConversations = friendProfileData && Array.isArray(friendProfileData.conversations)
        ? friendProfileData.conversations
        : [];
      const currentConversations = Array.isArray(profile.conversations)
        ? profile.conversations
        : [];

      // Update other user's profile if needed
      if (!otherConversations.includes(conversationId)) {
        await supabase
          .from("profiles")
          .update({
            conversations: [...otherConversations, conversationId],
          })
          .eq("uid", friendUid);
      }

      // Update current user's profile if needed
      if (!currentConversations.includes(conversationId)) {
        await supabase
          .from("profiles")
          .update({
            conversations: [...currentConversations, conversationId],
          })
          .eq("uid", profile.uid);
      }

      // Refresh profile to get updated conversations
      await new Promise((resolve) => setTimeout(resolve, 100));
      getProfile();

      // Select the conversation
      setSelectedConversation(conversationId);
      setSelectedRecipientName(friend.name);
      setSelectedFriendUid(friendUid);
    } catch (error) {
      console.error("Error finding/creating conversation:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const stopRecording = async () => {
    console.log(selectedConversation, audioRecorder.isRecording)
    if (!selectedConversation || !audioRecorder.isRecording) {
      return;
    }

    try {
      await audioRecorder.stop();
      if (audioRecorder.uri) {
        await sendMessage(
          navigation,
          { profile, conversations },
          audioRecorder.uri,
          selectedConversation
        );
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
    } finally {
      setLoudness(Array.from({ length: 20 }, () => 15));

      const widthAnimation = Animated.timing(animatedWidth, {
        toValue: 45,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const heightAnimation = Animated.timing(animatedHeight, {
        toValue: 45,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const radiusAnimation = Animated.timing(animatedRadius, {
        toValue: 50,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const parallelAnimation = Animated.parallel([
        widthAnimation,
        heightAnimation,
        radiusAnimation,
      ]);

      parallelAnimation.start();
    }
  };

  const styles = Styles(width, height, radius);


  return (
    <View style={styles.container}>
      {profile ? (
        <ConversationsScreen
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
        />
      ) : (
        <View style={styles.container}>
          <Text>Loading...</Text>
        </View>
      )}
      <RecordingPanel
        onPressIn={startRecording}
        onPressOut={stopRecording}
        showTopButtons={true}
        showRecipient={true}
        recipientName={selectedRecipientName}
        friends={friends}
        selectedFriendUid={selectedFriendUid}
        onFriendSelected={handleFriendSelected}
      />
    </View>
  );
};

export default HomeScreen;

const Styles = (
  buttonWidth: number,
  buttonHeight: number,
  buttonRadius: number
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    timeLabel: {
      paddingTop: 15,
      fontWeight: "600",
    },
  });
