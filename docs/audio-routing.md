# Built-in audio routing

## Current implementation

- Microphone passthrough can route the selected recording input to a chosen audio output.
- Soundboard playback and microphone passthrough can be sent to the same output and mixed by the operating system.
- Recording can capture the microphone, Windows system audio, or both together.
- Existing external virtual audio devices remain usable as routing outputs.

## Virtual microphone limitation

Electron can select existing input and output devices, mix audio inside the app, and capture Windows loopback audio. It cannot create a new system microphone endpoint by itself.

A fully self-contained virtual microphone requires a native virtual audio driver. The preferred long-term direction is a signed Windows driver bundled with the installer and managed by the app, with external virtual-cable devices retained as a fallback.

## Platform direction

- Windows: microphone passthrough and system loopback recording are supported by the current prototype.
- macOS and Linux: microphone passthrough can use available outputs, but system-audio capture and a virtual endpoint require platform-specific implementation.
