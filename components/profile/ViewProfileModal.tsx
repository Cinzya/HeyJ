import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
  PixelRatio,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Profile from "../../objects/Profile";
// @ts-expect-error
import { AntDesign, MaterialCommunityIcons } from "react-native-vector-icons";
import {
  ImagePickerResult,
  MediaTypeOptions,
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { openSettings } from "expo-linking";
import { supabase } from "../../utilities/Supabase";
import { useProfile } from "../../utilities/ProfileProvider";
import {
  ActionSheetProvider,
  useActionSheet,
} from "@expo/react-native-action-sheet";
import QRCode from "react-qr-code";
import RNQRGenerator from "rn-qr-generator";
import { BarCodeScanner } from "expo-barcode-scanner";
import Scanner from "@nuintun/qrcode";
import Conversation from "../../objects/Conversation";
import UUID from "react-native-uuid";
import { removeToken } from "../../utilities/Onesignal";

const ViewProfileModal = () => {
  const {
    viewProfile,
    profile,
    saveProfile,
    setViewProfile,
    getProfile,
    conversations,
    profiles,
  } = useProfile();

  const styles = Styles();

  const [showQr, setShowQr] = useState(false);
  const qrRef = useRef(null);

  const getProfilePic = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status === "granted") {
      const newPic = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        selectionLimit: 1,
      });

      if (newPic.canceled) {
        Alert.alert(
          "Something went wrong...",
          "You cancelled your selection. Please try again.",
          [{ text: "Ok", style: "default" }]
        );
        return;
      }

      if (!newPic.canceled && newPic.assets[0].uri !== null) {
        uploadProfilePic(newPic.assets[0].uri);
      } else {
        Alert.alert("Something went wrong...", "Please try again.", [
          { text: "Ok", style: "default" },
        ]);
      }
    } else if (status === "undetermined") {
      getProfilePic();
    } else {
      Alert.alert(
        "Something went wrong...",
        "Please open settings and confirm that this app has permission to the selected photo.",
        [
          { text: "Cancel", style: "destructive" },
          { text: "Open", style: "default", onPress: () => openSettings() },
        ]
      );
    }
  };

  const uploadProfilePic = async (uri: string) => {
    if (!profile) {
      return;
    }

    const fileName = `profile_${profile.uid}_${new Date().getTime()}.png`;
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("profile_images")
      .upload(fileName, buffer, { contentType: "image/png" });

    if (error) {
      console.error("Error uploading profile image:", error.message);
      saveProfile(
        new Profile(
          profile.uid,
          profile.profilePicture,
          profile.firstName,
          profile.lastName,
          profile.email,
          []
        )
      );
    }

    if (data) {
      const publicUrl = supabase.storage
        .from("profile_images")
        .getPublicUrl(fileName).data.publicUrl;

      saveProfile(
        new Profile(
          profile.uid,
          publicUrl,
          profile.firstName,
          profile.lastName,
          profile.email,
          []
        )
      );
    }
  };

  const shareProfile = async () => {
    const targetPixelCount = 1080;
    const pixelRatio = PixelRatio.get();
    const pixels = targetPixelCount / pixelRatio;

    const result = await captureRef(qrRef, {
      result: "tmpfile",
      height: pixels,
      width: pixels,
      quality: 1,
      format: "png",
    });

    Sharing.shareAsync(result);
  };

  const { showActionSheetWithOptions } = useActionSheet();

  const scanQr = () => {
    if (Platform.OS === "android") {
      setViewProfile(false);
    }

    const options = ["Library", "Camera", "Cancel"];
    const cancelButtonIndex = 2;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
      },
      async (i?: number) => {
        switch (i) {
          case 0:
            const library = await requestMediaLibraryPermissionsAsync();
            console.group(library);
            if (library.status === "granted") {
              const libraryRes = await launchImageLibraryAsync({
                mediaTypes: MediaTypeOptions.Images,
                allowsMultipleSelection: false,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                selectionLimit: 1,
                base64: true,
              });
              scanFromImage(libraryRes);
            } else {
              Alert.alert(
                "Something went wrong...",
                "Please open settings and confirm that this app has permission to the selected photo.",
                [
                  { text: "Cancel", style: "destructive" },
                  {
                    text: "Open",
                    style: "default",
                    onPress: () => openSettings(),
                  },
                ]
              );
            }
            break;

          case 1:
            const camera = await requestCameraPermissionsAsync();
            if (camera.status === "granted") {
              const cameraRes = await launchCameraAsync({
                mediaTypes: MediaTypeOptions.Images,
                allowsMultipleSelection: false,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                selectionLimit: 1,
              });
              scanFromImage(cameraRes);
            } else {
              Alert.alert(
                "Something went wrong...",
                "Please open settings and confirm that this app has permission to the camera.",
                [
                  { text: "Cancel", style: "destructive" },
                  {
                    text: "Open",
                    style: "default",
                    onPress: () => openSettings(),
                  },
                ]
              );
            }
            break;

          case cancelButtonIndex:
          // Cancelled
        }
      }
    );
  };

  const scanFromImage = async (result: ImagePickerResult) => {
    if (!profile) {
      return;
    }

    if (result.canceled) {
      Alert.alert(
        "Something went wrong...",
        "You cancelled your selection. Please try again.",
        [{ text: "Ok", style: "default" }]
      );
      return;
    }

    if (!result.canceled && result.assets[0].uri !== null) {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: "base64",
      });

      if (base64) {
        RNQRGenerator.detect({
          base64: base64,
        })
          .then((item) => {
            startConversation(item.values[0].trim());
          })
          .catch((err) => {
            alert(err);
          });
      }
    } else {
      Alert.alert("Something went wrong...", "Please try again.", [
        { text: "Ok", style: "default" },
      ]);
    }
  };

  const startConversation = async (uid: string) => {
    if (!profile) {
      return;
    }

    if (uid === profile.uid) {
      Alert.alert(
        "Something went wrong...",
        "You cannot start a conversation with your own account."
      );
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select()
      .eq("uid", uid);

    if (data && data[0]) {
      const otherProfile = data[0];
      const newConversation =
        conversations.filter(
          (c) => c.uids.includes(uid) && c.uids.includes(profile.uid)
        ).length === 0;

      if (newConversation) {
        const conversationId = UUID.v4().toString();
        const conversation = new Conversation(
          conversationId,
          [uid, profile.uid],
          [],
          [
            { uid: uid, timestamp: new Date() },
            { uid: profile.uid, timestamp: new Date() },
          ]
        );

        await supabase
          .from("conversations")
          .insert(conversation.toJSON())
          .then(async ({ data, error }) => {
            if (!error) {
              const { error: e1 } = await supabase.from("profiles").upsert({
                ...otherProfile,
                conversations: [...otherProfile.conversations, conversationId],
              });

              if (!e1) {
                const { error: e2 } = await supabase.from("profiles").upsert({
                  ...profile.toJSON(),
                  conversations: [
                    ...profile.toJSON().conversations,
                    conversationId,
                  ],
                });

                if (!e1 && !e2) {
                  getProfile();
                  setViewProfile(false);
                }
              }
            }
          });
      } else {
        Alert.alert(
          "Something went wrong...",
          "You already have a conversation with this user."
        );
      }
    } else {
      Alert.alert(
        "Something went wrong...",
        "No profile exists for this QR code."
      );
      return;
    }
  };

  return (
    <Modal visible={profile !== null && viewProfile} transparent>
      <ActionSheetProvider>
        <TouchableOpacity
          style={{
            flex: 1,
            height: "100%",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
          onPress={() => setViewProfile(false)}
        >
          <TouchableWithoutFeedback style={styles.modal}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Profile Details</Text>
              {!showQr ? (
                <TouchableOpacity onPress={getProfilePic}>
                  <Image
                    style={styles.image}
                    source={{
                      uri: profile?.profilePicture,
                    }}
                  />
                  <View style={styles.plusButton}>
                    <AntDesign
                      name="plus"
                      color={styles.modalSheet.backgroundColor}
                      size={25}
                    />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={shareProfile}>
                  <View style={styles.qrCode} ref={qrRef}>
                    <QRCode
                      size={250}
                      style={{
                        height: "auto",
                        maxWidth: "100%",
                        width: "100%",
                      }}
                      value={profile?.uid || ""}
                      viewBox={`0 0 250 250`}
                    />
                    <Image
                      style={styles.pfpQr}
                      source={{
                        uri: profile?.profilePicture,
                      }}
                    />
                  </View>
                  <Text style={styles.actionText}>Tap to Share QR Code</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.labelText}>
                {(profile?.firstName || "---") +
                  " " +
                  (profile?.lastName || "---")}
              </Text>
              <View style={styles.divider} />
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionContainer}
                  onPress={scanQr}
                >
                  <MaterialCommunityIcons name="qrcode" />
                  <Text style={styles.actionText}>Scan QR code</Text>
                </TouchableOpacity>
                <View style={styles.dividerVertical} />
                <TouchableOpacity
                  style={styles.actionContainer}
                  onPress={() => setShowQr(!showQr)}
                >
                  <MaterialCommunityIcons name="qrcode-scan" />
                  <Text style={styles.actionText}>
                    {showQr ? "Hide" : "View"} your QR code
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  removeToken(profile!.uid);
                  supabase.auth.signOut();
                }}
              >
                <Text style={styles.saveLabel}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </ActionSheetProvider>
    </Modal>
  );
};

export default ViewProfileModal;

const Styles = () =>
  StyleSheet.create({
    modal: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    modalSheet: {
      width: Dimensions.get("screen").width * 0.8,
      backgroundColor: "#F9F9F9",
      paddingTop: 65,
      paddingBottom: 85,
      alignItems: "center",
      borderRadius: 15,
      borderColor: "#A2A2A2",
      borderWidth: 0.5,
      zIndex: 1000,
      shadowColor: "#A2A2A2",
      shadowOpacity: 0.5,
      shadowOffset: { width: 3, height: 3 },
    },
    modalTitle: {
      top: 15,
      alignSelf: "center",
      position: "absolute",
      color: "#515151",
      fontSize: 25,
      fontWeight: "600",
    },
    image: {
      width: 150,
      height: 150,
      borderRadius: 75,
      borderColor: "#000",
      borderWidth: 0.5,
    },
    plusButton: {
      width: 35,
      height: 35,
      backgroundColor: "#000",
      borderColor: "#FFF",
      borderRadius: 50,
      borderWidth: 1,
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
      bottom: 10,
      right: 10,
    },
    labelText: {
      marginTop: 25,
      fontSize: 20,
      fontWeight: "600",
    },
    qrCode: {
      width: 250,
      height: 250,
      backgroundColor: "#FFF",
    },
    pfpQr: {
      width: 50,
      height: 50,
      borderRadius: 10,
      borderColor: "#FFF",
      borderWidth: 1,
      marginBottom: 25,
      position: "absolute",
      top: 100,
      left: 100,
    },
    actionText: {
      alignSelf: "center",
      paddingTop: 5,
      textAlign: "center",
    },
    divider: {
      width: "80%",
      borderBottomWidth: 0.5,
      borderBottomColor: "#515151",
      paddingVertical: 10,
    },
    actionsContainer: {
      flexDirection: "row",
      paddingVertical: 5,
      alignItems: "center",
    },
    dividerVertical: {
      height: "100%",
      borderLeftWidth: 1,
      borderLeftColor: "#515151",
      marginHorizontal: 5,
    },
    actionContainer: {
      width: "30%",
      alignItems: "center",
    },
    saveLabel: {
      fontSize: 20,
      fontWeight: "600",
    },
    saveButton: {
      width: "50%",
      height: 50,
      borderRadius: 15,
      borderColor: "#A2A2A2",
      borderWidth: 0.5,
      backgroundColor: "#C2C2C2",
      bottom: 15,
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
  });
