import { StyleSheet } from "react-native";
import { colors, spacing, typography, borderRadius } from "./theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  separator: {
    width: "98%",
    borderBottomWidth: 0.5,
    borderBottomColor: "darkgrey",
    alignSelf: "center",
  },
  conversationContainer: {
    width: "100%",
    height: 90,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  selectedConversationContainer: {
    width: "100%",
    height: 90,
    flexDirection: "row",
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  statusIndicator: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIcon: {
    fontSize: 12,
    color: colors.white,
  },
  textContainer: {
    flex: 1,
    marginLeft: 5,
    justifyContent: "center",
  },
  profileName: {
    fontSize: typography.body.fontSize,
    fontWeight: "bold",
    marginBottom: 4,
  },
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: typography.bodySmall.fontSize,
    color: "gray",
    marginRight: 6,
  },
  paperPlaneIcon: {
    fontSize: 12,
    color: "gray",
  },
  button: {
    width: 75,
    height: 75,
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    right: 0,
  },
  targetIcon: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  friendRequestContainer: {
    width: "100%",
    height: 90,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.lightBlue,
    borderLeftWidth: 3,
    borderLeftColor: colors.blueBorder,
  },
  friendRequestProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    marginRight: 12,
  },
  friendRequestTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  friendRequestName: {
    fontSize: typography.body.fontSize,
    fontWeight: "bold",
    marginBottom: 4,
  },
  friendRequestLabel: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  friendRequestButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  friendRequestButton: {
    paddingHorizontal: 16,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 70,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: typography.bodySmall.fontSize,
  },
  declineButton: {
    backgroundColor: colors.borderLight,
  },
  declineButtonText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: typography.bodySmall.fontSize,
  },
});

