import { Alert } from "react-native";

/**
 * Handles errors consistently across the application
 * @param error - The error to handle (Error object or unknown)
 * @param context - Context string describing where the error occurred
 * @param showAlert - Whether to show an alert to the user (default: false)
 * @param defaultMessage - Default message to show if error message cannot be extracted
 */
export const handleError = (
  error: Error | unknown,
  context: string,
  showAlert: boolean = false,
  defaultMessage: string = "An unexpected error occurred"
): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] Error:`, errorMessage);

  if (showAlert) {
    Alert.alert("Error", errorMessage || defaultMessage);
  }
};

/**
 * Extracts a user-friendly error message from API errors
 * @param error - The error from an API call (Supabase error or similar)
 * @param defaultMessage - Default message to return if error message cannot be extracted
 * @returns User-friendly error message string
 */
export const handleApiError = (error: any, defaultMessage: string): string => {
  if (!error) {
    return defaultMessage;
  }

  // Handle Supabase errors
  if (error.message) {
    return error.message;
  }

  // Handle error objects with error property
  if (error.error) {
    return error.error;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  return defaultMessage;
};

