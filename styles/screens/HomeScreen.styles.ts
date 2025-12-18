import { StyleSheet } from "react-native";
import { colors } from "../theme";

export const createStyles = (
  buttonWidth: number,
  buttonHeight: number,
  buttonRadius: number
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      overflow: "visible" as any,
    },
    timeLabel: {
      paddingTop: 15,
      fontWeight: "600",
    },
  });

