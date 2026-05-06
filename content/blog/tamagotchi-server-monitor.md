---
title: "Technical Report: The Tamagotchi Server Monitor, Under the Hood"
date: 2024-11-01
description: "ESP32S3 + Python + MQTT: a real-time server monitor with systemd integration, pipe-delimited payload parsing, GPIO interrupt wake patterns, and I2C displays."
tags: ["ESP32", "Embedded", "MQTT", "Hardware", "Python"]
---

This post is also published on [Medium](https://medium.com/@lm0/technical-report-the-tamagotchi-server-monitor-under-the-hood-e8d1b4310745).

## Overview

The Tamagotchi Server Monitor is an ESP32S3 IoT device that displays real-time server status on a 0.96" OLED — housed inside a repurposed Tamagotchi shell. It communicates over MQTT pub/sub with a Python hub running on an Orange Pi, implements deep sleep power management, and wakes on GPIO interrupt when messages arrive.

## Architecture

The system has two components:

- **ESP32S3 client**: Subscribes to MQTT topics, parses pipe-delimited payloads, drives the OLED via I2C, and enters deep sleep between updates
- **Python hub (Orange Pi)**: Polls server status, publishes formatted payloads to MQTT, runs as a systemd service

## Key Implementation Details

### Payload Format

The hub publishes pipe-delimited strings to keep parsing simple on the constrained microcontroller:

```
SERVER_NAME|STATUS|PLAYER_COUNT|TPS
```

Parsing on the ESP32S3 side uses a simple tokenizer rather than JSON to minimize heap usage.

### Deep Sleep + GPIO Wake

The device uses `esp_sleep_enable_ext0_wakeup()` on the MQTT interrupt pin. When a message arrives, the MQTT broker signals the pin, waking the device from deep sleep. This cuts idle current draw from ~80mA to ~20µA.

### I2C Display

The OLED is driven via the Adafruit SSD1306 library over I2C. Two display zones handle different content:
- **Top zone**: Server name + online/offline indicator dot
- **Bottom zone**: Player count and TPS (ticks per second)

## What I Learned

Embedded constraints breed resourceful solutions. Fitting meaningful server telemetry into a Tamagotchi shell required rethinking every assumption about power, display real estate, and data format. The result is a device that's genuinely useful and has never failed to start a conversation.
