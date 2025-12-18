import { StyleSheet, Platform } from "react-native";
import { spacing, colors } from "../theme";

export const createStyles = (
  buttonWidth: number,
  buttonHeight: number,
  buttonRadius: number,
  insets: { top: number; bottom: number; left: number; right: number }
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      overflow: "visible" as any,
    },
    listContainer: {
      paddingTop: Platform.OS === "ios" ? insets.top - 25 : 15,
      paddingBottom: 250,
      justifyContent: "flex-end",
    },
    messageContainer: {
      width: "100%",
      paddingHorizontal: 12,
    },
  });
