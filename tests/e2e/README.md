# HeyJ E2E Tests

End-to-end tests for the HeyJ web application using Playwright.

## Overview

This test suite validates the complete user flow of:
1. User registration/login
2. Adding friends via user codes
3. Starting conversations
4. Exchanging audio messages

## Prerequisites

Before running the tests, ensure you have:

1. **Node.js and Yarn** installed
2. **Playwright browsers** installed (run `npx playwright install chromium`)
3. **Supabase backend** accessible and configured
4. **Expo web server** can be started (`yarn web`)

## Configuration

### Environment Variables (Optional)

You can configure the tests using environment variables:

- `SUPABASE_URL` - Your Supabase project URL (defaults to the configured value)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key (defaults to the configured value)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (required for user cleanup)
- `APP_URL` - The URL where the web app runs (defaults to `http://localhost:8081`)
- `CLEANUP_TEST_DATA` - Set to `false` to skip test data cleanup (defaults to `true`)

### Setting Service Role Key

For proper test cleanup, set your Supabase service role key:

1. Get your service role key from Supabase Dashboard → Settings → API
2. Set it as an environment variable:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

Or create a `.env` file (make sure it's in `.gitignore`):
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Running Tests

### Run all tests
```bash
yarn test:e2e
```

### Run tests with UI mode (interactive)
```bash
yarn test:e2e:ui
```

### Run tests in debug mode
```bash
yarn test:e2e:debug
```

### Run tests in headed mode (see browser)
```bash
yarn test:e2e:headed
```

### Run a specific test file
```bash
npx playwright test tests/e2e/friend-and-message-flow.spec.ts
```

## Test Structure

```
tests/e2e/
├── config/
│   └── test-config.ts          # Test configuration
├── pages/                      # Page Object Models
│   ├── LoginPage.ts
│   ├── SignupPage.ts
│   ├── HomePage.ts
│   ├── AddFriendModal.ts
│   ├── FriendRequestsPage.ts
│   └── ConversationPage.ts
├── utils/                      # Test utilities
│   ├── test-helpers.ts         # General helpers
│   ├── user-manager.ts         # User management
│   └── mock-audio.ts           # Audio mocking
├── friend-and-message-flow.spec.ts  # Main test file
└── README.md                   # This file
```

## Test Flow

The main test (`friend-and-message-flow.spec.ts`) simulates:

1. **Phase 1: User Registration**
   - Creates two test user accounts
   - Logs both users in

2. **Phase 2: Add Friend**
   - User 1 opens profile and gets their user code
   - User 2 adds User 1 as a friend using the code
   - User 1 accepts the friend request

3. **Phase 3: Start Conversation**
   - Both users select each other from recipient dropdown
   - Conversation is created/selected

4. **Phase 4: Send Messages**
   - Users exchange audio messages
   - Messages are uploaded and appear in conversations

5. **Phase 5: Verification**
   - Verifies conversations exist
   - Checks that both users can see messages

## Audio Mocking

Since browsers can't access the microphone in automated tests, the tests use audio mocking:

- `MediaRecorder` API is mocked to simulate recording
- Test audio blobs are created programmatically
- Audio uploads are intercepted and handled

See `tests/e2e/utils/mock-audio.ts` for implementation details.

## Troubleshooting

### Tests fail with "Cannot connect to Supabase"

- Ensure your Supabase project is running and accessible
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Verify network connectivity

### Tests fail with "User already exists"

- Test users are cleaned up automatically, but if tests are interrupted, users may remain
- Set `CLEANUP_TEST_DATA=false` to skip cleanup and manually delete test users
- Or use the service role key to enable automatic cleanup

### Tests timeout waiting for elements

- React Native Web may render elements differently than expected
- Check the actual DOM structure using Playwright's inspector: `yarn test:e2e:debug`
- Update selectors in Page Object Models if needed

### Audio recording doesn't work

- Audio mocking is set up automatically, but if issues occur:
  - Check browser console for errors
  - Verify `setupAudioMocking()` is called in test setup
  - Ensure `MediaRecorder` mock is working correctly

### Navigation issues

- React Navigation on web may behave differently than native
- Add explicit waits for navigation transitions
- Use `waitForLoadState('networkidle')` after navigation

## CI/CD Integration

To run tests in CI:

```yaml
# Example GitHub Actions workflow
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: yarn test:e2e
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Best Practices

1. **Test Isolation**: Each test creates unique user accounts with timestamps
2. **Cleanup**: Always clean up test data after tests complete
3. **Selectors**: Use semantic selectors (text, roles) over CSS selectors when possible
4. **Waits**: Use explicit waits for async operations (Supabase calls, navigation)
5. **Page Objects**: Keep page interactions in Page Object Models for maintainability

## Adding New Tests

1. Create a new test file in `tests/e2e/`
2. Import necessary Page Objects and utilities
3. Follow the existing test structure
4. Ensure proper cleanup in `afterAll` hooks

Example:
```typescript
import { test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('My New Test', () => {
  test('should do something', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // ... test code
  });
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [React Native Web](https://necolas.github.io/react-native-web/)
