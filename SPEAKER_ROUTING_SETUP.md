# Speaker Routing Setup Guide

This guide explains how to set up the native audio routing module for speaker/earpiece functionality.

## Overview

The speaker toggle feature requires native modules to route audio between the earpiece (default, like a phone call) and the loudspeaker. The native module files have been created, but they need to be integrated into your project.

## For Expo Development Builds

If you're using Expo development builds (not Expo Go), you can add the native modules:

### iOS Setup

1. Add the Swift file to your iOS project:
   - Copy `ios/AudioRoutingModule.swift` to your iOS project
   - Make sure it's added to your Xcode project target

2. Add the Objective-C bridge file:
   - Copy `ios/AudioRoutingModule.m` to your iOS project
   - Make sure it's added to your Xcode project target

3. Register the module in your `AppDelegate` or main app file:
   ```swift
   // In your AppDelegate or main app initialization
   // The module should auto-register via RCT_EXTERN_MODULE
   ```

### Android Setup

1. Add the Kotlin files to your Android project:
   - Copy `android/app/src/main/java/com/heyj/AudioRoutingModule.kt` to your Android project
   - Copy `android/app/src/main/java/com/heyj/AudioRoutingModulePackage.kt` to your Android project
   - Update the package name if it's different from `com.heyj`

2. Register the package in your `MainApplication.java` or `MainApplication.kt`:
   ```kotlin
   // In MainApplication.kt
   import com.heyj.AudioRoutingModulePackage
   
   override fun getPackages(): List<ReactPackage> {
       return listOf(
           // ... other packages
           AudioRoutingModulePackage()
       )
   }
   ```

## For Expo Managed Workflow (Expo Go)

If you're using Expo Go, native modules won't work. You have two options:

1. **Switch to Development Builds**: Create a development build that includes the native modules
2. **Use Expo Config Plugin**: Create an Expo config plugin to automatically add the native code

## Testing

After setting up the native modules:

1. Build your app with the native modules included
2. Toggle the speaker button in the app
3. Audio should route to:
   - **Earpiece** (default): When speaker toggle is OFF
   - **Loudspeaker**: When speaker toggle is ON

## Troubleshooting

- If audio doesn't route correctly, check the console logs for errors
- Make sure the native module is properly registered
- On iOS, ensure you have the necessary permissions in `Info.plist`
- On Android, ensure you have the necessary permissions in `AndroidManifest.xml`

## Note

The JavaScript code will gracefully handle the case where the native module isn't available (it will log a warning but won't crash). However, speaker routing will only work when the native module is properly set up.
