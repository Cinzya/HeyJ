import { View, Text } from "react-native";
import RequirementItem from "./RequirementItem";
import { styles } from "../../styles/screens/SignupScreen.styles";

interface PasswordStrength {
  score: number;
  color: string;
  label: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

interface PasswordStrengthIndicatorProps {
  passwordStrength: PasswordStrength;
}

const PasswordStrengthIndicator = ({
  passwordStrength,
}: PasswordStrengthIndicatorProps) => {
  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBars}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.strengthBar,
              index <= passwordStrength.score && {
                backgroundColor: passwordStrength.color,
              },
            ]}
          />
        ))}
      </View>
      <Text
        style={[
          styles.strengthLabel,
          { color: passwordStrength.color },
        ]}
      >
        {passwordStrength.label}
      </Text>

      {/* Requirements Checklist */}
      <View style={styles.requirementsContainer}>
        <Text style={styles.requirementsTitle}>Password must have:</Text>
        <RequirementItem
          met={passwordStrength.requirements.length}
          text={__DEV__ ? "At least 1 character (dev mode)" : "At least 12 characters"}
        />
        <RequirementItem
          met={passwordStrength.requirements.uppercase}
          text="One uppercase letter (A-Z)"
        />
        <RequirementItem
          met={passwordStrength.requirements.lowercase}
          text="One lowercase letter (a-z)"
        />
        <RequirementItem
          met={passwordStrength.requirements.number}
          text="One number (0-9)"
        />
        <RequirementItem
          met={passwordStrength.requirements.special}
          text="One special character (!@#$%^&*)"
        />
      </View>
    </View>
  );
};

export default PasswordStrengthIndicator;
