import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("splitter.splitFileToFolder", async () => {
      await handleSplitCommand(getOutputDirectory);
    }),
    vscode.commands.registerCommand(
      "splitter.splitFileToSameFolder",
      async () => {
        await handleSplitCommand(getSameDirectory);
      }
    )
  );
}

async function handleSplitCommand(
  getOutputDir: (editor: vscode.TextEditor) => Promise<string | undefined>
) {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage("No active file to split.");
    return;
  }

  const content = editor.document.getText();
  const outputDir = await getOutputDir(editor);

  if (!outputDir) {
    vscode.window.showWarningMessage("Operation canceled.");
    return;
  }

  try {
    splitFileContent(content, outputDir);
    vscode.window.showInformationMessage(
      `Files successfully saved to ${outputDir}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error splitting files: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function getOutputDirectory(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: "Enter the directory to save the files",
    value: path.join(
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
      "split_output"
    ),
  });
}

function getSameDirectory(editor: vscode.TextEditor): Promise<string> {
  return Promise.resolve(path.dirname(editor.document.uri.fsPath));
}

function splitFileContent(content: string, outputDir: string) {
  const splitPattern = /^\/\/\s*(.+?)\r?\n/gm; // Supports \n and \r\n
  const matches = Array.from(content.matchAll(splitPattern));
  if (matches.length === 0) {
    throw new Error("No delimiter comments found in the file.");
  }

  ensureDirectoryExists(outputDir);

  matches.forEach((match, index) => {
    const [fullMatch, fileName] = match;
    const start = match.index! + fullMatch.length;
    const end =
      index < matches.length - 1 ? matches[index + 1].index! : content.length;
    const fileContent = content.substring(start, end).trim();

    if (fileContent) {
      writeToFile(outputDir, fileName, fileContent);
    }
  });
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function writeToFile(
  outputDir: string,
  fileName: string,
  content: string
): Promise<void> {
  const filePath = path.join(outputDir, fileName);

  ensureDirectoryExists(path.dirname(filePath));

  if (fs.existsSync(filePath)) {
    const userChoice = await vscode.window.showInformationMessage(
      `File ${fileName} already exists. Overwrite?`,
      { modal: true },
      "Yes",
      "No"
    );

    if (userChoice !== "Yes") {
      vscode.window.showInformationMessage(`Skipped writing to ${fileName}`);
      return;
    }
  }

  fs.writeFileSync(filePath, content, "utf8");
}

export function deactivate() {}
