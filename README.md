# Soundboard

A desktop soundboard for playing local audio or sounds from [MyInstants](https://www.myinstants.com/), with selectable audio output and system-wide hotkeys.

## What's new in this overhaul

- Assign individual sounds to customizable global hotkeys.
- Enable single-key piano-style bindings.
- Optionally assign multiple sounds to one hotkey.
- Choose whether random playback uses local or hotkey-bound sounds.
- Reorder sounds and adjust individual volume levels.
- Modernized Electron, React, TypeScript, build, testing, and packaging systems.

## Features

- Add, remove, search, and play sounds.
- Choose the soundboard's audio output device.
- Use an EXP Soundboard-compatible JSON sound list.
- Stop all active sounds with a hotkey.

## Default hotkeys

| Action | Default |
| --- | --- |
| Random sound | `Ctrl+F1` |
| Stop all sounds | `Ctrl+Shift+S` |
| First seven filtered local sounds | `Ctrl+F2` through `Ctrl+F8` |

Hotkeys and bindings can be changed from **Settings** without restarting the app.

## Installation

The modernized version has not yet been published as a GitHub release. The Windows package has been locally validated.

Linux AppImage and macOS DMG packaging are configured but remain unverified.

## Audio routing

Routing soundboard audio into Discord or streaming software currently requires a virtual audio device or mixer, such as Voicemeeter Banana with VB-CABLE on Windows. Configure it to mix your microphone and soundboard audio together.

Built-in routing and microphone mixing are planned but not yet implemented.

## Development

Requirements:

- Node.js `24.18.x`
- Yarn `4.17.x`

Install dependencies and start the development app:

```powershell
yarn install
yarn start
```

Open Developer Tools with `Alt+Ctrl+I`.

Validate the project:

```powershell
yarn check
```

Create a production package in the `release` directory:

```powershell
yarn package
```

## Technology

Electron 41 · React 19 · React Router 7 · TypeScript 6 · Webpack 5

## License

[MIT](LICENSE)
