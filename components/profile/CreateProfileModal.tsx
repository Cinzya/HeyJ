import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import Profile from "../../objects/Profile";
// @ts-expect-error
import { AntDesign } from "react-native-vector-icons";
import {
  ImagePickerAsset,
  MediaTypeOptions,
  requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
} from "expo-image-picker";
import { openSettings } from "expo-linking";
import { supabase } from "../../utilities/Supabase";
import { useProfile } from "../../utilities/ProfileProvider";

const CreateProfileModal = () => {
  const { appReady, user, profile, saveProfile, getProfile } = useProfile();
  const uid = user?.id || "";
  const email = user?.email! || "";

  const [profileImage, setProfileImage] = useState(
    "https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0="
  );
  const [selectedProfileImage, setSelectedProfileImage] =
    useState<ImagePickerAsset | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    getProfile();
  }, [user]);

  useEffect(() => {
    const fullName = user?.user_metadata.full_name as string;
    const nameParts = fullName ? fullName.split(" ") : [];

    setFirstName(nameParts[0] || "");
    setLastName(nameParts.slice(1).join(" ") || "");

    if (user?.user_metadata.picture) {
      setProfileImage(user.user_metadata.picture);
    }
  }, [user]);

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
        setSelectedProfileImage(newPic.assets[0]);
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

  const uploadProfilePic = async () => {
    const fileName = `profile_${uid}_${new Date().getTime()}.png`;
    const response = await fetch(selectedProfileImage!.uri);
    const buffer = await response.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("profile_images")
      .upload(fileName, buffer, { contentType: "image/png" });

    if (error) {
      console.error("Error uploading profile image:", error.message);
      saveProfile(
        new Profile(uid, profileImage, firstName, lastName, email, [])
      );
    }

    if (data) {
      const publicUrl = supabase.storage
        .from("profile_images")
        .getPublicUrl(fileName).data.publicUrl;

      return publicUrl;
    }
  };

  const createUser = async () => {
    if (firstName.trim() !== "" && lastName.trim() !== "") {
      if (selectedProfileImage) {
        const publicUri = await uploadProfilePic();
        saveProfile(
          new Profile(
            uid,
            publicUri || profileImage,
            firstName,
            lastName,
            email,
            []
          )
        );
      } else {
        saveProfile(
          new Profile(uid, profileImage, firstName, lastName, email, [])
        );
      }
    } else {
      Alert.alert("Uh oh!", "A first name and last name are required.");
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
              <Text style={styles.labelText}>{"First Name: "}</Text>
              <TextInput
                style={styles.fieldTextInput}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={styles.textInputWrapper}>
              <Text style={styles.labelText}>{"Last Name: "}</Text>
              <TextInput
                style={styles.fieldTextInput}
                value={lastName}
                onChangeText={setLastName}
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

const styles = StyleSheet.create({
  modal: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSheet: {
    width: Dimensions.get("screen").width * 0.8,
    height: Dimensions.get("screen").height * 0.5,
    backgroundColor: "#F9F9F9",
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 25,
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
    bottom: 30,
    right: 10,
  },
  textInputWrapper: {
    flexDirection: "row",
    alignSelf: "flex-start",
    marginLeft: 15,
    marginBottom: 10,
  },
  labelText: {
    fontSize: 20,
    fontWeight: "600",
  },
  textInputLabel: {
    fontSize: 20,
    fontWeight: "600",
  },
  fieldTextInput: {
    width: 200,
    fontSize: 16,
    alignSelf: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#515151",
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
