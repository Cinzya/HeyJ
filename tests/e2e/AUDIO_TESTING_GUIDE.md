# Audio Playback Testing Guide

## Current Test Status

**⚠️ Tests are NOT all passing** - They have partial success with known issues:

### What Works ✅
- **Phase 1: User Registration/Login** - ✅ Works
- **Phase 2: Add Friend** - ✅ Works  
- **Phase 5: Verification** - ✅ Works

### What Doesn't Work ❌
- **Phase 3: Start Conversation** - ❌ Page context closes
- **Phase 4: Send Messages** - ❌ Page context closes
- **Audio Playback Test** - ❌ Home page visibility check fails

## How to Test Audio Playback

I've created utilities to verify audio playback in E2E tests. Here's how they work:

### 1. Audio Playback Detection Methods

#### Method 1: Check HTML5 Audio/Video Elements
```typescript
import { isAudioPlaying } from './utils/audio-playback-verification';

const playing = await isAudioPlaying(page);
// Returns true if any audio/video element is playing
```

This checks:
- `<audio>` and `<video>` elements
- Their `paused`, `currentTime`, and `ended` properties
- Works for standard HTML5 audio

#### Method 2: Get Detailed Playback State
```typescript
import { getAudioPlaybackState } from './utils/audio-playback-verification';

const state = await getAudioPlaybackState(page);
// Returns: { isPlaying, currentTime, duration, audioElements }
```

This provides:
- Current playback status
- Playback position (currentTime)
- Total duration
- Number of audio elements on page

#### Method 3: Wait for Audio to Start
```typescript
import { waitForAudioToStart } from './utils/audio-playback-verification';

const started = await waitForAudioToStart(page, timeoutMs);
// Waits up to timeoutMs for audio to start playing
```

#### Method 4: Check Playback Indicators
```typescript
import { verifyAudioPlaybackIndicators } from './utils/audio-playback-verification';

const hasIndicators = await verifyAudioPlaybackIndicators(page);
// Checks for UI indicators like "Playing" text, animations, etc.
```

### 2. Testing Audio Playback in Your App

Since your app uses **expo-audio** (not standard HTML5 audio), the detection is more complex:

#### expo-audio on Web
- expo-audio uses Web Audio API or HTML5 Audio under the hood
- The actual `<audio>` element might be created dynamically
- You may need to wait for the audio element to be created

#### Recommended Approach:

```typescript
test('Verify audio message playback', async ({ page }) => {
  // 1. Navigate to conversation with messages
  await page.goto('/conversation/123');
  await page.waitForLoadState('networkidle');
  
  // 2. Find and click play button
  const playButton = page.locator('button').filter({
    hasText: /play|▶/i
  }).first();
  
  await playButton.click();
  
  // 3. Wait for audio element to appear and start playing
  // expo-audio might create the audio element after click
  await page.waitForTimeout(1000);
  
  // 4. Check if audio is playing
  const isPlaying = await isAudioPlaying(page);
  expect(isPlaying).toBe(true);
  
  // 5. Verify playback state
  const state = await getAudioPlaybackState(page);
  expect(state.isPlaying).toBe(true);
  expect(state.currentTime).toBeGreaterThan(0);
  
  // 6. Monitor playback progress
  await page.waitForTimeout(2000);
  const progressState = await getAudioPlaybackState(page);
  expect(progressState.currentTime).toBeGreaterThan(state.currentTime);
});
```

### 3. expo-audio Specific Testing

Since expo-audio uses Web Audio API, you might need to:

#### Option A: Check for AudioContext
```typescript
const hasAudioContext = await page.evaluate(() => {
  return typeof (window as any).AudioContext !== 'undefined' ||
         typeof (window as any).webkitAudioContext !== 'undefined';
});
```

#### Option B: Monitor Network Requests
```typescript
// Wait for audio file to be loaded
await page.waitForResponse(response => 
  response.url().includes('.mp3') || 
  response.url().includes('.m4a') ||
  response.url().includes('audio')
);
```

#### Option C: Check for expo-audio Specific Elements
```typescript
// expo-audio might create specific DOM elements
const audioElements = await page.locator('audio, [data-expo-audio]').all();
```

### 4. Complete Audio Test Example

```typescript
import { test, expect } from '@playwright/test';
import {
  isAudioPlaying,
  waitForAudioToStart,
  getAudioPlaybackState,
  playAudioAndVerify,
} from './utils/audio-playback-verification';

test('Play audio message and verify playback', async ({ page }) => {
  // Setup: Login and navigate to conversation
  // ... (your setup code)
  
  // Find play button for a message
  const playButton = page.locator('button[aria-label*="play" i]').first();
  
  // Click play and verify audio starts
  const audioStarted = await playAudioAndVerify(page, playButton, 10000);
  
  if (audioStarted) {
    // Get detailed state
    const state = await getAudioPlaybackState(page);
    console.log('Audio is playing:', state);
    
    // Verify playback
    expect(state.isPlaying).toBe(true);
    expect(state.duration).toBeGreaterThan(0);
    
    // Wait for some playback
    await page.waitForTimeout(2000);
    
    // Verify progress
    const newState = await getAudioPlaybackState(page);
    expect(newState.currentTime).toBeGreaterThan(state.currentTime);
  } else {
    // Fallback: Check for visual indicators
    const hasIndicators = await verifyAudioPlaybackIndicators(page);
    expect(hasIndicators).toBe(true);
  }
});
```

### 5. Limitations & Workarounds

#### Limitation: expo-audio Web Implementation
- expo-audio on web might not create standard HTML5 audio elements
- Web Audio API is harder to detect from Playwright
- Audio might be playing but not detectable via DOM inspection

#### Workarounds:

1. **Check Visual Indicators**
   ```typescript
   // Look for "Playing" text, waveform animations, etc.
   const playingIndicator = page.locator('text=/playing/i');
   await expect(playingIndicator).toBeVisible();
   ```

2. **Monitor State Changes**
   ```typescript
   // Check if play button changes to pause button
   const pauseButton = page.locator('button[aria-label*="pause" i]');
   await expect(pauseButton).toBeVisible({ timeout: 5000 });
   ```

3. **Check Network Activity**
   ```typescript
   // Verify audio file was requested
   const audioRequest = await page.waitForResponse(
     response => response.url().includes('audio') && response.status() === 200
   );
   ```

4. **Use expo-audio Test Utilities** (if available)
   ```typescript
   // If expo-audio exposes test utilities
   const audioState = await page.evaluate(() => {
     return window.__EXPO_AUDIO_STATE__; // Hypothetical
   });
   ```

### 6. Debugging Audio Playback

```typescript
// Enable console logging
page.on('console', msg => {
  if (msg.text().includes('audio') || msg.text().includes('playback')) {
    console.log('Browser console:', msg.text());
  }
});

// Take screenshot when audio should be playing
await playButton.click();
await page.waitForTimeout(1000);
await page.screenshot({ path: 'audio-playing.png' });

// Check all audio elements
const audioInfo = await page.evaluate(() => {
  const elements = document.querySelectorAll('audio, video');
  return Array.from(elements).map(el => ({
    src: (el as HTMLAudioElement).src,
    paused: (el as HTMLAudioElement).paused,
    currentTime: (el as HTMLAudioElement).currentTime,
    duration: (el as HTMLAudioElement).duration,
  }));
});
console.log('Audio elements:', audioInfo);
```

## Summary

**Current Status**: Tests are **partially working** - registration and friend requests work, but message sending and audio playback testing need refinement.

**Audio Testing**: The utilities I created can detect standard HTML5 audio, but expo-audio on web may require additional approaches:
1. Visual indicator checks (recommended)
2. Network request monitoring
3. State change detection (play → pause button)
4. Custom expo-audio state inspection (if available)

The test infrastructure is in place - you may need to adjust detection methods based on how expo-audio actually renders on web.
