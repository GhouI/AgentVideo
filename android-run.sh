#!/bin/bash
# Script to run Android build with correct environment variables

export JAVA_HOME="$HOME/scoop/apps/temurin17-jdk/current"
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"

echo "JAVA_HOME: $JAVA_HOME"
echo "ANDROID_HOME: $ANDROID_HOME"
echo "Running expo android..."

npx expo run:android
