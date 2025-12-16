import { StyleSheet } from "react-native";

export const createStyles = (
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

