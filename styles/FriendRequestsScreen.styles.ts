import { StyleSheet } from "react-native";
import { colors, spacing, typography, borderRadius } from "./theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: 10,
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
  },
  requestInfo: {
    flex: 1,
  },
  name: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  userCode: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pendingText: {
    fontSize: typography.caption.fontSize,
    color: colors.lightGray,
    fontStyle: "italic",
  },
  warningText: {
    fontSize: typography.caption.fontSize,
    color: colors.red,
    fontStyle: "italic",
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
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
  rejectButton: {
    backgroundColor: colors.borderLight,
  },
  rejectButtonText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: typography.bodySmall.fontSize,
  },
  blockButton: {
    backgroundColor: colors.red,
  },
  blockButtonProminent: {
    backgroundColor: colors.redDark,
    borderWidth: 2,
    borderColor: colors.redDarker,
  },
  blockButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: typography.bodySmall.fontSize,
  },
  cancelButton: {
    backgroundColor: colors.borderLight,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: typography.bodySmall.fontSize,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderDark,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.lightGray,
    marginTop: 16,
  },
});

