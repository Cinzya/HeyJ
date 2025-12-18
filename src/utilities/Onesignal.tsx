import { OneSignal, LogLevel } from 'react-native-onesignal';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './Supabase';
import { handleError } from './errorHandler';

// Get OneSignal App ID from environment
const ONESIGNAL_APP_ID = Constants.expoConfig?.extra?.oneSignalAppId ||
                         process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;

const ONESIGNAL_REST_API_KEY = Constants.expoConfig?.extra?.oneSignalRestApiKey ||
                                process.env.ONESIGNAL_REST_API_KEY;

// Debug logging
console.log('🔍 OneSignal Environment Check:', {
  fromExpoConfig: Constants.expoConfig?.extra?.oneSignalAppId,
  fromProcessEnv: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
  finalAppId: ONESIGNAL_APP_ID,
  fromExpoConfigRestKey: !!Constants.expoConfig?.extra?.oneSignalRestApiKey,
  fromProcessEnvRestKey: !!process.env.ONESIGNAL_REST_API_KEY,
  hasRestApiKey: !!ONESIGNAL_REST_API_KEY,
  platform: Platform.OS,
});

/**
 * Initialize OneSignal SDK and register for push notifications
 * Call this once when the user logs in
 */
export async function initializeOneSignal(userId: string): Promise<void> {
  try {
    // Skip OneSignal SDK initialization on web (only mobile needs SDK)
    // Web can still send notifications via REST API in sendPushNotification()
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform detected - skipping OneSignal SDK initialization');
      console.log('✅ Notifications can still be sent via REST API');
      return;
    }

    if (!ONESIGNAL_APP_ID) {
      console.error('❌ OneSignal App ID not configured:', {
        expoConfigExtra: Constants.expoConfig?.extra,
        processEnvKeys: Object.keys(process.env).filter(k => k.includes('ONESIGNAL')),
      });
      console.warn('OneSignal App ID not configured - push notifications disabled');
      return;
    }

    console.log('🔔 Initializing OneSignal for user:', userId);

    // Enable verbose logging for debugging (disable in production)
    if (__DEV__) {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    }

    // Initialize OneSignal
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Set external user ID (use Supabase user ID)
    OneSignal.login(userId);

    // Request notification permissions
    if (Platform.OS === 'ios') {
      await OneSignal.Notifications.requestPermission(true);
    } else if (Platform.OS === 'android') {
      const permission = await OneSignal.Notifications.getPermissionAsync();
      console.log('📱 Android notification permission status:', permission);

      if (!permission) {
        console.log('📱 Requesting Android notification permission...');
        await OneSignal.Notifications.requestPermission(true);
      }
    }

    // Get player ID and save to profile
    await registerForPushNotificationsAsync(userId);

    console.log('✅ OneSignal initialized successfully');
  } catch (error) {
    handleError(error, 'initializeOneSignal');
  }
}

/**
 * Register device for push notifications and store player ID
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<void> {
  try {
    // Get the OneSignal Subscription ID (async method)
    const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();

    if (subscriptionId) {
      console.log('📱 OneSignal Subscription ID:', subscriptionId);

      // Save subscription ID to push_tokens table
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          uid: userId,
          tokens: [subscriptionId],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'uid'
        });

      if (error) {
        handleError(error, 'registerForPushNotificationsAsync');
      } else {
        console.log('✅ Subscription ID saved to push_tokens');
      }
    } else {
      console.log('⚠️ No OneSignal Subscription ID available yet, listening for changes...');

      // Listen for subscription changes (ID may be null on first run)
      OneSignal.User.pushSubscription.addEventListener('change', async (subscription) => {
        const newSubscriptionId = subscription.current.id;
        if (newSubscriptionId) {
          console.log('📱 OneSignal Subscription ID received:', newSubscriptionId);

          const { error } = await supabase
            .from('push_tokens')
            .upsert({
              uid: userId,
              tokens: [newSubscriptionId],
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'uid'
            });

          if (error) {
            handleError(error, 'registerForPushNotificationsAsync - subscription change');
          } else {
            console.log('✅ Subscription ID saved to push_tokens');
          }
        }
      });
    }
  } catch (error) {
    handleError(error, 'registerForPushNotificationsAsync');
  }
}

/**
 * Remove OneSignal subscription ID on logout
 */
export const removeToken = async (uid: string): Promise<void> => {
  try {
    // Clear external user ID
    OneSignal.logout();

    // Remove subscription ID from push_tokens
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('uid', uid);

    if (error) {
      handleError(error, 'removeToken');
    } else {
      console.log('✅ OneSignal subscription ID removed from push_tokens');
    }
  } catch (error) {
    handleError(error, 'removeToken');
  }
};

/**
 * Send push notification via OneSignal REST API
 * Uses external user ID (Supabase UID) for user-centric targeting
 */
export async function sendPushNotification(
  toUid: string,
  fromName: string,
  fromPhoto: string,
  conversationId: string,
  messageUrl: string,
  notificationType: 'message' | 'friend_request' | 'friend_accepted' = 'message'
): Promise<void> {
  try {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.warn('OneSignal not configured - skipping notification');
      return;
    }

    // Prepare notification content based on type
    const notificationContent = getNotificationContent(notificationType, fromName);

    // Prepare notification data payload
    const data: Record<string, any> = {
      conversationId,
      messageUrl,
      fromName,
      fromPhoto,
      notificationType,
    };

    console.log('📨 Sending push notification to user:', toUid);

    // Call OneSignal REST API
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        include_external_user_ids: [toUid], // User-centric targeting
        headings: { en: notificationContent.title },
        contents: { en: notificationContent.message },
        data: data,
        large_icon: fromPhoto,
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        ios_sound: 'default',
        android_sound: 'default',
        priority: 10,
        content_available: true,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ OneSignal API error:', result);
      throw new Error(`OneSignal API error: ${JSON.stringify(result)}`);
    }

    console.log('✅ Push notification sent successfully:', result.id);
  } catch (error) {
    // Don't block the main operation if notification fails
    console.warn('⚠️ Failed to send push notification:', error);
    handleError(error, 'sendPushNotification', false); // Don't show alert to user
  }
}

/**
 * Helper function to generate notification content based on type
 */
function getNotificationContent(
  type: string,
  fromName: string
): { title: string; message: string } {
  switch (type) {
    case 'message':
      return {
        title: fromName,
        message: 'Sent you a voice message',
      };
    case 'friend_request':
      return {
        title: fromName,
        message: 'Sent you a friend request',
      };
    case 'friend_accepted':
      return {
        title: fromName,
        message: 'Accepted your friend request',
      };
    default:
      return {
        title: fromName,
        message: 'You have a new notification',
      };
  }
}
