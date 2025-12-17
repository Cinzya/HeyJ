import { Page } from '@playwright/test';

/**
 * Audio mocking utilities for E2E tests
 * Since browsers can't access microphone in automated tests, we need to mock audio recording
 */

/**
 * Create a minimal valid audio blob for testing
 * This creates a very short audio file that can be used to simulate recording
 */
export function createTestAudioBlob(): Blob {
  // Create a minimal WAV file (simpler than MP3)
  // WAV header + minimal silent audio data
  const sampleRate = 44100;
  const duration = 2; // 2 seconds
  const numChannels = 1; // mono
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = sampleRate * duration * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint8(0, 0x52); // 'R'
  view.setUint8(1, 0x49); // 'I'
  view.setUint8(2, 0x46); // 'F'
  view.setUint8(3, 0x46); // 'F'
  view.setUint32(4, fileSize - 8, true); // File size - 8
  view.setUint8(8, 0x57); // 'W'
  view.setUint8(9, 0x41); // 'A'
  view.setUint8(10, 0x56); // 'V'
  view.setUint8(11, 0x45); // 'E'

  // fmt chunk
  view.setUint8(12, 0x66); // 'f'
  view.setUint8(13, 0x6D); // 'm'
  view.setUint8(14, 0x74); // 't'
  view.setUint8(15, 0x20); // ' '
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  view.setUint8(36, 0x64); // 'd'
  view.setUint8(37, 0x61); // 'a'
  view.setUint8(38, 0x74); // 't'
  view.setUint8(39, 0x61); // 'a'
  view.setUint32(40, dataSize, true);

  // Fill with silence (zeros)
  for (let i = 44; i < fileSize; i++) {
    view.setUint8(i, 0);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Mock audio recording APIs in the browser
 * This intercepts expo-audio or MediaRecorder API calls
 */
export async function setupAudioMocking(page: Page): Promise<void> {
  // Inject script to mock MediaRecorder API
  await page.addInitScript(() => {
    // Mock MediaRecorder if it doesn't exist or override it
    if (typeof window !== 'undefined') {
      const originalMediaRecorder = (window as any).MediaRecorder;
      
      (window as any).MediaRecorder = class MockMediaRecorder {
        private chunks: Blob[] = [];
        private _state: 'inactive' | 'recording' | 'paused' = 'inactive';
        private _stream?: MediaStream;
        
        constructor(stream?: MediaStream, private options?: any) {
          this._stream = stream;
          // Create a test audio blob when recording starts
        }

        start() {
          this._state = 'recording';
          // Simulate recording by creating chunks
          setTimeout(() => {
            // Create a minimal audio blob
            const blob = new Blob(['test audio data'], { type: 'audio/webm' });
            this.chunks.push(blob);
          }, 100);
        }

        stop() {
          this._state = 'inactive';
          const event = new Event('dataavailable');
          (event as any).data = this.createTestBlob();
          this.dispatchEvent(event);
          
          const stopEvent = new Event('stop');
          this.dispatchEvent(stopEvent);
        }

        pause() {
          this._state = 'paused';
        }

        resume() {
          this._state = 'recording';
        }

        get state() {
          return this._state;
        }

        get stream() {
          return this._stream;
        }

        addEventListener(type: string, listener: EventListener) {
          // Store listeners for later dispatch
          if (!(this as any)._listeners) {
            (this as any)._listeners = {};
          }
          if (!(this as any)._listeners[type]) {
            (this as any)._listeners[type] = [];
          }
          (this as any)._listeners[type].push(listener);
        }

        dispatchEvent(event: Event) {
          const listeners = (this as any)._listeners?.[event.type] || [];
          listeners.forEach((listener: EventListener) => {
            listener(event);
          });
        }

        private createTestBlob(): Blob {
          // Create a minimal audio blob
          // In a real scenario, this would be a proper audio file
          return new Blob(['test audio'], { type: 'audio/webm' });
        }
      };

      // Also mock getUserMedia to return a mock stream
      if (navigator.mediaDevices) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
          // Return a mock MediaStream
          const mockStream = {
            getTracks: () => [],
            getAudioTracks: () => [],
            getVideoTracks: () => [],
            active: true,
            id: 'mock-stream-id',
          } as any as MediaStream;
          
          return Promise.resolve(mockStream);
        };
      }
    }
  });
}

/**
 * Intercept audio file uploads and replace with test audio
 */
export async function interceptAudioUploads(page: Page): Promise<void> {
  await page.route('**/storage/v1/object/**', async (route) => {
    // Allow the upload to proceed, but we could modify it here if needed
    await route.continue();
  });
}

/**
 * Create a File object from a Blob for testing
 */
export function createAudioFile(blob: Blob, filename: string = 'test-audio.wav'): File {
  return new File([blob], filename, { type: blob.type });
}
