import { sendPushNotification } from './Onesignal';
import { supabase } from './Supabase';

/**
 * Test push notification flow
 * Call this from a test screen or debug menu
 */
export async function testPushNotifications(
  fromUserId: string,
  toUserId: string
): Promise<void> {
  try {
    console.log('🧪 Testing push notification flow...');

    // 1. Check if sender has profile
    const { data: fromProfile } = await supabase
      .from('profiles')
      .select('name, profilePicture')
      .eq('uid', fromUserId)
      .single();

    if (!fromProfile) {
      console.error('❌ Sender profile not found');
      return;
    }

    // 2. Check if recipient has subscription ID
    const { data: toTokens } = await supabase
      .from('push_tokens')
      .select('tokens')
      .eq('uid', toUserId)
      .single();

    console.log('📋 Recipient Push Tokens:', toTokens?.tokens);

    if (!toTokens?.tokens || toTokens.tokens.length === 0) {
      console.error('❌ Recipient does not have any push tokens');
      return;
    }

    // 3. Send test notification
    await sendPushNotification(
      toUserId,
      fromProfile.name,
      fromProfile.profilePicture,
      'test-conversation-id',
      'https://example.com/test-audio.mp3',
      'message'
    );

    console.log('✅ Test notification sent successfully');
  } catch (error) {
    console.error('❌ Test notification failed:', error);
  }
}
