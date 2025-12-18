// React
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";

// Third-party libraries
import { AntDesign } from "@expo/vector-icons";
import {
  ImagePickerAsset,
  requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
} from "expo-image-picker";
import { openSettings } from "expo-linking";

// Utilities & Providers
import { supabase } from "../../utilities/Supabase";
import { useProfile } from "../../utilities/ProfileProvider";

// Objects
import Profile from "../../objects/Profile";

// Styles
import { styles } from "../../styles/components/profile/CreateProfileModal.styles";

const CreateProfileModal = () => {
  const { appReady, user, profile, saveProfile, getProfile } = useProfile();
  const uid = user?.id || "";
  const email = user?.email! || "";

  const [profileImage, setProfileImage] = useState(
    "https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0="
  );
  const [selectedProfileImage, setSelectedProfileImage] =
    useState<ImagePickerAsset | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    getProfile();
  }, [user]);

  useEffect(() => {
    const fullName = user?.user_metadata.full_name as string;
    setName(fullName || "");

    if (user?.user_metadata.picture) {
      setProfileImage(user.user_metadata.picture);
    }
  }, [user]);

  const getProfilePic = async () => {
    console.log("📸 CreateProfileModal: Profile picture button pressed");

    const { status } = await requestMediaLibraryPermissionsAsync();
    console.log("📸 CreateProfileModal: Permission status:", status);

    if (status === "granted") {
      console.log("📸 CreateProfileModal: Opening image picker...");
      const newPic = await launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        selectionLimit: 1,
      });

      console.log("📸 CreateProfileModal: Result:", newPic.canceled ? "canceled" : "selected");

      if (newPic.canceled) {
        Alert.alert(
          "Something went wrong...",
          "You cancelled your selection. Please try again.",
          [{ text: "Ok", style: "default" }]
        );
        return;
      }

      if (!newPic.canceled && newPic.assets[0].uri !== null) {
        console.log("📸 CreateProfileModal: Image selected:", newPic.assets[0].uri);
        setSelectedProfileImage(newPic.assets[0]);
      } else {
        Alert.alert("Something went wrong...", "Please try again.", [
          { text: "Ok", style: "default" },
        ]);
      }
    } else if (status === "undetermined") {
      console.log("📸 CreateProfileModal: Permission undetermined, requesting again...");
      getProfilePic();
    } else {
      console.log("📸 CreateProfileModal: Permission denied");
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

  const uploadProfilePic = async () => {
    const fileName = `profile_${uid}_${new Date().getTime()}.png`;
    const response = await fetch(selectedProfileImage!.uri);
    const buffer = await response.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("profile_images")
      .upload(fileName, buffer, { contentType: "image/png" });

    if (error) {
      console.error("Error uploading profile image:", error.message, error);
      const userCode = `${name.replace(/\s+/g, '')}@${Math.floor(Math.random() * 9999)}`;
      saveProfile(
        new Profile(uid, profileImage, name, email, [], userCode)
      );
    }

    if (data) {
      const publicUrl = supabase.storage
        .from("profile_images")
        .getPublicUrl(fileName).data.publicUrl;

      console.log(publicUrl);
      return publicUrl;
    }
  };

  const createUser = async () => {
    if (name.trim() !== "") {
      // Generate a unique user code
      const userCode = `${name.replace(/\s+/g, '')}@${Math.floor(Math.random() * 9999)}`;

      if (selectedProfileImage) {
        const publicUri = await uploadProfilePic();
        saveProfile(
          new Profile(
            uid,
            publicUri || profileImage,
            name,
            email,
            [],
            userCode
          )
        );
      } else {
        saveProfile(
          new Profile(uid, profileImage, name, email, [], userCode)
        );
      }
    } else {
      Alert.alert("Uh oh!", "A name is required.");
    }
  };

  return (
    <Modal visible={appReady && !profile} transparent>
      <View style={styles.modal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={150}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Profile Details</Text>
            <TouchableOpacity onPress={getProfilePic}>
              <Image
                style={styles.image}
                source={{
                  uri: selectedProfileImage?.uri || profileImage,
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
            <View style={styles.textInputWrapper}>
              <Text style={styles.labelText}>{"Name: "}</Text>
              <TextInput
                style={styles.fieldTextInput}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={createUser}>
              <Text style={styles.textInputLabel}>Save Profile</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default CreateProfileModal;
