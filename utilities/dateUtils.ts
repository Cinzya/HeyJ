import { format, isToday, isYesterday, isThisWeek } from "date-fns";

/**
 * Formats a date timestamp for display in conversation lists and messages
 * @param timestamp - The date to format
 * @returns Formatted date string (e.g., "Today 3:45 PM", "Yesterday 2:30 PM", "Monday", "12/25/2023")
 */
export const formatDate = (timestamp: Date): string => {
  if (isToday(timestamp)) {
    return "Today " + format(timestamp, "h:mm a");
  } else if (isYesterday(timestamp)) {
    return "Yesterday " + format(timestamp, "h:mm a");
  } else if (isThisWeek(timestamp)) {
    return format(timestamp, "EEEE");
  } else {
    return format(timestamp, "MM/dd/yyyy");
  }
};

/**
 * Formats a date timestamp for display in conversation list items (shorter format)
 * @param timestamp - The date to format
 * @returns Formatted time string (e.g., "3:45 PM")
 */
export const formatTime = (timestamp: Date): string => {
  return format(timestamp, "h:mm a");
};

