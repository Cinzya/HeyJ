import { Page } from '@playwright/test';

/**
 * Utilities for verifying audio playback in E2E tests
 */

/**
 * Check if audio is currently playing on the page
 * This checks the HTML5 audio/video elements or Web Audio API
 */
export async function isAudioPlaying(page: Page): Promise<boolean> {
  try {
    // Check HTML5 audio/video elements
    const audioPlaying = await page.evaluate(() => {
      const audioElements = document.querySelectorAll('audio, video');
      for (const element of Array.from(audioElements)) {
        const audio = element as HTMLAudioElement | HTMLVideoElement;
        if (!audio.paused && audio.currentTime > 0 && !audio.ended) {
          return true;
        }
      }
      return false;
    });

    if (audioPlaying) {
      return true;
    }

    // Check Web Audio API (used by expo-audio on web)
    const webAudioPlaying = await page.evaluate(() => {
      // Check if AudioContext is active
      if (typeof (window as any).AudioContext !== 'undefined' || 
          typeof (window as any).webkitAudioContext !== 'undefined') {
        // Try to detect active audio nodes
        // This is a simplified check - expo-audio might use different APIs
        return false; // Can't reliably detect without access to AudioContext instances
      }
      return false;
    });

    return webAudioPlaying;
  } catch (error) {
    console.log('Error checking audio playback:', error);
    return false;
  }
}

/**
 * Wait for audio to start playing
 */
export async function waitForAudioToStart(
  page: Page,
  timeout: number = 10000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await isAudioPlaying(page)) {
      return true;
    }
    await page.waitForTimeout(200);
  }
  return false;
}

/**
 * Wait for audio to stop playing
 */
export async function waitForAudioToStop(
  page: Page,
  timeout: number = 30000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (!(await isAudioPlaying(page))) {
      return true;
    }
    await page.waitForTimeout(200);
  }
  return false;
}

/**
 * Get audio playback state information
 */
export async function getAudioPlaybackState(page: Page): Promise<{
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioElements: number;
}> {
  return await page.evaluate(() => {
    const audioElements = document.querySelectorAll('audio, video');
    let isPlaying = false;
    let currentTime = 0;
    let duration = 0;

    for (const element of Array.from(audioElements)) {
      const audio = element as HTMLAudioElement | HTMLVideoElement;
      if (!audio.paused && audio.currentTime > 0 && !audio.ended) {
        isPlaying = true;
        currentTime = Math.max(currentTime, audio.currentTime);
        duration = Math.max(duration, audio.duration || 0);
      }
    }

    return {
      isPlaying,
      currentTime,
      duration,
      audioElements: audioElements.length,
    };
  });
}

/**
 * Check if a specific audio element is playing by its source URL
 */
export async function isSpecificAudioPlaying(
  page: Page,
  audioUrl: string
): Promise<boolean> {
  return await page.evaluate((url) => {
    const audioElements = document.querySelectorAll('audio, video');
    for (const element of Array.from(audioElements)) {
      const audio = element as HTMLAudioElement | HTMLVideoElement;
      if (audio.src && audio.src.includes(url) && 
          !audio.paused && audio.currentTime > 0 && !audio.ended) {
        return true;
      }
    }
    return false;
  }, audioUrl);
}

/**
 * Monitor audio playback progress
 * Returns an array of playback states over time
 */
export async function monitorAudioPlayback(
  page: Page,
  durationMs: number,
  intervalMs: number = 500
): Promise<Array<{ time: number; isPlaying: boolean; currentTime: number }>> {
  const states: Array<{ time: number; isPlaying: boolean; currentTime: number }> = [];
  const startTime = Date.now();
  const endTime = startTime + durationMs;

  while (Date.now() < endTime) {
    const state = await getAudioPlaybackState(page);
    states.push({
      time: Date.now() - startTime,
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
    });
    await page.waitForTimeout(intervalMs);
  }

  return states;
}

/**
 * Verify that audio playback indicators are visible
 * (e.g., playing indicator, waveform animation, etc.)
 */
export async function verifyAudioPlaybackIndicators(page: Page): Promise<boolean> {
  // Look for common audio playback indicators
  const indicators = [
    page.locator('text=/playing/i'),
    page.locator('[class*="playing"]'),
    page.locator('[class*="playback"]'),
    page.locator('[aria-label*="playing" i]'),
  ];

  for (const indicator of indicators) {
    try {
      if (await indicator.isVisible({ timeout: 1000 }).catch(() => false)) {
        return true;
      }
    } catch (e) {
      // Continue checking other indicators
    }
  }

  return false;
}

/**
 * Click play button and verify audio starts
 */
export async function playAudioAndVerify(
  page: Page,
  playButtonSelector: string,
  timeout: number = 10000
): Promise<boolean> {
  // Click the play button
  await page.click(playButtonSelector);
  
  // Wait for audio to start
  const started = await waitForAudioToStart(page, timeout);
  
  if (!started) {
    // Fallback: check for playback indicators
    return await verifyAudioPlaybackIndicators(page);
  }
  
  return started;
}
