import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_USER_PASSWORD, TEST_USER_NAME_PREFIX } from '../config/test-config';

/**
 * User management utilities for E2E tests
 */

let adminClient: SupabaseClient | null = null;

/**
 * Get or create Supabase admin client (requires service role key)
 */
function getAdminClient(): SupabaseClient | null {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set. User cleanup will be limited.');
    return null;
  }
  
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(userNumber: number, timestamp: number): string {
  return `test-user${userNumber}-${timestamp}@example.com`;
}

/**
 * Generate a test user name
 */
export function generateTestUserName(userNumber: number): string {
  return `${TEST_USER_NAME_PREFIX}${userNumber}`;
}

/**
 * Create a test user account via Supabase Auth API
 * Note: This uses the anon key, so email confirmation may be required
 */
export async function createTestUser(
  email: string,
  password: string,
  name: string
): Promise<{ userId: string; userCode?: string }> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Sign up the user
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        profilePicture: 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=',
      },
    },
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('User creation returned no user data');
  }

  // Wait a bit for the profile trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Fetch the profile to get userCode
  const { data: profileData, error: profileError } = await client
    .from('profiles')
    .select('userCode')
    .eq('uid', data.user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.warn(`Warning: Could not fetch profile: ${profileError.message}`);
  }

  return {
    userId: data.user.id,
    userCode: profileData?.userCode,
  };
}

/**
 * Delete a test user account (requires service role key)
 */
export async function deleteTestUser(email: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) {
    console.warn(`⚠️  Cannot delete user ${email} - service role key not available`);
    return;
  }

  try {
    // Get user by email
    const { data: users, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      console.warn(`Warning: Could not list users: ${listError.message}`);
      return;
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.log(`User ${email} not found, skipping deletion`);
      return;
    }

    // Delete user (this should cascade delete profile)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.warn(`Warning: Could not delete user ${email}: ${deleteError.message}`);
    } else {
      console.log(`✅ Deleted test user: ${email}`);
    }
  } catch (error) {
    console.warn(`Error deleting user ${email}:`, error);
  }
}

/**
 * Clean up test data for a user (friend requests, conversations, etc.)
 * This is a best-effort cleanup
 */
export async function cleanupTestUserData(userId: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) {
    return;
  }

  try {
    // Delete friend requests
    await admin.from('friend_requests').delete().or(`requesterId.eq.${userId},addresseeId.eq.${userId}`);
    
    // Note: Conversations and messages are typically not deleted in production
    // but could be cleaned up here if needed for testing
  } catch (error) {
    console.warn(`Error cleaning up test data for user ${userId}:`, error);
  }
}
