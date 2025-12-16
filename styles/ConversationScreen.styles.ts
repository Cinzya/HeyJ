import { StyleSheet, Platform } from "react-native";
import { spacing } from "./theme";

export const createStyles = (
  buttonWidth: number,
  buttonHeight: number,
  buttonRadius: number,
  insets: { top: number; bottom: number; left: number; right: number }
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContainer: {
      paddingTop: Platform.OS === "ios" ? insets.top - 25 : 175,
      paddingBottom: 400,
      justifyContent: "flex-end",
    },
    messageContainer: {
      width: "100%",
      paddingHorizontal: spacing.md,
    },
  });

