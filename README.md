# Soundboard

A desktop soundboard built with Electron, React, and TypeScript. Play local audio or search MyInstants, choose an output device, and trigger sounds through customizable system-wide hotkeys.

## Features

- Add, remove, reorder, and play local sounds.
- Search and play sounds from [MyInstants](https://www.myinstants.com/) with a minimum two-character search.
- Choose the audio output device used by the soundboard.
- Assign individual sounds to customizable global hotkeys.
- Optionally enable single-key piano-style bindings.
- Optionally assign multiple sounds to the same hotkey.
- Choose whether random playback uses local sounds or hotkey-bound sounds.
- Adjust local and hotkey-bound sound volume.
- Stop all active sounds with a hotkey.
- Use an EXP Soundboard-compatible JSON sound list.

## Default hotkeys

| Action | Default |
| --- | --- |
| Play a random sound | `Ctrl+F1` |
| Stop all sounds | `Ctrl+Shift+S` |
| Play the first seven filtered local sounds | `Ctrl+F2` through `Ctrl+F8` |

Sound bindings and the random/stop hotkeys can be changed from **Settings**.

## Installation

Windows is the currently verified platform. Download the latest installer from the [public releases page](https://github.com/Alexflu/soundboard/releases/latest) and run `soundboard Setup x.x.x.exe`.

Linux AppImage and macOS DMG packaging are configured, but the modernized application has not yet been fully validated on those platforms.

## Getting started

1. Open **Settings** and choose an audio output.
2. Keep the generated default sound list or choose an existing compatible JSON file.
3. Add local files or search MyInstants.
4. Click a sound to play it, or assign it to a hotkey.

Preferences and the default sound list are stored in Electron's user-data directory. Typical locations are:

- Windows: `%APPDATA%\soundboard`
- macOS: `~/Library/Application Support/soundboard`
- Linux: `~/.config/soundboard`

## Routing audio into Discord or streaming software

The app currently plays through the selected audio output device. Sending soundboard audio into a communication application's microphone input still requires an external virtual audio device or mixer, such as Voicemeeter Banana with VB-CABLE on Windows.

Configure that mixer to combine your microphone and the soundboard output so you can speak and play sounds simultaneously. Built-in microphone mixing and virtual-device routing are planned but are not implemented yet.

## Development

### Requirements

- Node.js `24.18.x`
- Yarn `4.17.x`
- Git or GitHub Desktop

Clone the repository, open PowerShell in the repository folder, and install dependencies:

```powershell
yarn install
```

### Start the development app

```powershell
yarn start
```

The development server supports hot reload. Open Developer Tools with `Alt+Ctrl+I`.

### Validate changes

```powershell
yarn check
```

This runs ESLint, TypeScript type checking, and the Jest test suite.

### Create a production package

```powershell
yarn package
```

Packages are written to the `release` directory. Packaging targets the current operating system.

## Technology

- Electron 41
- React 19
- React Router 7
- TypeScript 6
- Webpack 5
- Jest and Testing Library

## License

[MIT](LICENSE)
