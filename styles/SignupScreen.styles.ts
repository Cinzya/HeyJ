import { StyleSheet, Dimensions } from "react-native";
import { colors, spacing, typography, borderRadius, buttonHeight } from "./theme";

const { width } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: spacing.xxl,
  },
  content: {
    padding: spacing.lg,
    alignItems: "center",
  },
  title: {
    ...typography.title,
    marginBottom: 10,
    color: colors.text,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.xl,
    marginBottom: 10,
    position: "relative",
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageOverlayText: {
    color: colors.white,
    fontSize: typography.caption.fontSize,
    marginTop: 5,
    fontWeight: "600",
  },
  optionalText: {
    fontSize: typography.caption.fontSize,
    color: colors.lightGray,
    marginBottom: spacing.lg,
  },
  nameRow: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 400,
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  nameInput: {
    width: "48%",
    marginBottom: 0,
  },
  input: {
    width: "100%",
    maxWidth: 400,
    height: buttonHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: typography.body.fontSize,
    backgroundColor: colors.backgroundSecondary,
  },
  passwordContainer: {
    width: "100%",
    maxWidth: 400,
    position: "relative",
    marginBottom: spacing.md,
  },
  passwordInput: {
    width: "100%",
    height: buttonHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingRight: 50,
    fontSize: typography.body.fontSize,
    backgroundColor: colors.backgroundSecondary,
  },
  eyeIcon: {
    position: "absolute",
    right: spacing.md,
    top: 13,
  },
  matchIcon: {
    position: "absolute",
    right: spacing.md,
    top: 13,
  },
  strengthContainer: {
    width: "100%",
    maxWidth: 400,
    marginBottom: spacing.md,
  },
  strengthBars: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 2,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: "600",
    marginBottom: 10,
  },
  requirementsContainer: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  requirementsTitle: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: "600",
    marginBottom: spacing.sm,
    color: colors.darkGray,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  requirementTextMet: {
    color: colors.success,
  },
  signupButton: {
    width: "100%",
    maxWidth: 400,
    height: buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  signupButtonDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  signupButtonText: {
    color: colors.white,
    fontSize: typography.body.fontSize,
    fontWeight: "600",
  },
  backButton: {
    marginTop: spacing.lg,
    padding: 10,
  },
  backButtonText: {
    color: colors.link,
    fontSize: typography.bodySmall.fontSize,
    textAlign: "center",
  },
});

