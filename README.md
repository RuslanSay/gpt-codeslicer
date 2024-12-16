# GPT CodeSlicer

GPT CodeSlicer is a Visual Studio Code extension designed to simplify the process of splitting ChatGPT-generated multi-file outputs into organized files and folders. With two distinct commands, you can easily manage your code snippets and organize them into the desired directory structure.

## Features

- Splits ChatGPT-generated code snippets into separate files and folders.
- Automatically creates directories based on file paths in comments.
- Provides two flexible commands:
  - **Split Files to Folder**: Save files to a specified directory.
  - **Split Files Here**: Save files in the same directory as the source file.

## Commands

### 1. Split Files to Folder

- Use this command to specify a directory where the split files should be saved.
- Trigger the command via:
  - Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`): Search for `GPT CodeSlicer: Split Files to Folder`.
  - Context Menu (optional): Right-click in the editor and select the command (if configured).

### 2. Split Files Here

- Automatically saves the split files in the same folder as the currently active file.
- Trigger the command via:
  - Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`): Search for `GPT CodeSlicer: Split Files Here`.
  - Context Menu (optional): Right-click in the editor and select the command (if configured).

## Example

### Input:

```
// components/Button.jsx
import React from 'react';

const Button = () => <button>Click me</button>;

export default Button;

// styles/Button.module.css
button {
  color: red;
}
```

### Output:

```
split_output/
├── components/
│   └── Button.jsx
└── styles/
    └── Button.module.css
```

If you use **Split Files Here**, the output will be saved in the same directory as the input file.

## Installation

You can install this extension directly from the VS Code Marketplace or build it locally.

### Build Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/gpt-codeslicer.git
   cd gpt-codeslicer
   ```

2. Install dependencies and compile:

   ```bash
   npm install
   npm run compile
   ```

3. Install the extension in VS Code:

   ```bash
   code --install-extension gpt-codeslicer-1.0.0.vsix
   ```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
