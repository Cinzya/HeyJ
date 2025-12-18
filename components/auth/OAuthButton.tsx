import * as React from "react";
import { TouchableOpacity, Image } from "react-native";
import { signInWithApple, signInWithGoogle } from "../../utilities/AuthHelper";
import { styles } from "../../styles/components/auth/OAuthButton.styles";

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
  }
};

export default OAuthButton;
