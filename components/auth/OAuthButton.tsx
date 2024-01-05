import * as React from "react";
import { TouchableOpacity, Image, StyleSheet } from "react-native";
import {
  signInWithApple,
  signInWithFacebook,
  signInWithGoogle,
} from "../../utilities/AuthHelper";

type OAuthButtonType = "google" | "apple" | "facebook";

type OAuthButtonProps = {
  type: OAuthButtonType;
};

const OAuthButton = ({ type }: OAuthButtonProps) => {
  switch (type) {
    case "google":
      return (
        <TouchableOpacity style={styles.button} onPress={signInWithGoogle}>
          <Image
            style={styles.logo}
            source={require("../../assets/google-logo.png")}
          />
        </TouchableOpacity>
      );

    case "apple":
      return (
        <TouchableOpacity style={styles.button} onPress={signInWithApple}>
          <Image
            style={styles.logo}
            source={require("../../assets/apple-logo.png")}
          />
        </TouchableOpacity>
      );

    case "facebook":
      return (
        <TouchableOpacity style={styles.button} onPress={signInWithFacebook}>
          <Image
            style={styles.logo}
            source={require("../../assets/facebook-logo.png")}
          />
        </TouchableOpacity>
      );
  }
};

export default OAuthButton;

const styles = StyleSheet.create({
  button: {
    width: 100,
    height: 100,
    margin: 15,
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#F2F2F2",
  },
  logo: {
    width: 75,
    height: 75,
    alignSelf: "center",
  },
});
