/**
 * Test configuration for E2E tests
 * Contains environment variables and test settings
 */

// Supabase configuration - use environment variables if available, otherwise use defaults
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ifmwepbepoujfnzisrjz.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXdlcGJlcG91amZuemlzcmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODQzODIsImV4cCI6MjA3NTM2MDM4Mn0.itUOgm94FL8dRPPiNz3TYZm4ca4e8LWlB-FNzrL9298';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// App URL
export const APP_URL = process.env.APP_URL || 'http://localhost:8081';

// Test user credentials pattern
export const TEST_USER_PASSWORD = 'TestPassword123!';
export const TEST_USER_NAME_PREFIX = 'TestUser';

// Timeouts (in milliseconds)
export const TIMEOUTS = {
  DEFAULT: 60000,
  LONG: 120000,
  SHORT: 10000,
  NETWORK: 30000,
};

// Test data cleanup
export const CLEANUP_TEST_DATA = process.env.CLEANUP_TEST_DATA !== 'false';
