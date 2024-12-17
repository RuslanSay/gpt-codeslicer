import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Pattern used for splitting files based on comments like:
// // path/to/filename.ext
const splitPattern = /^\/\/\s*(.+?)\r?\n/gm;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("splitter.splitFileToFolder", async () => {
      await handleSplitFromEditor(getOutputDirectory);
    }),
    vscode.commands.registerCommand(
      "splitter.splitFileToSameFolder",
      async () => {
        await handleSplitFromEditor(getSameDirectory);
      }
    ),
    vscode.commands.registerCommand(
      "splitter.splitClipboardToFolder",
      async () => {
        await handleSplitFromClipboard(getOutputDirectory);
      }
    ),
    vscode.commands.registerCommand(
      "splitter.splitClipboardToSelectedFolder",
      async (uri: vscode.Uri) => {
        // If the command is triggered without a URI (not from the explorer context menu)
        if (!uri) {
          vscode.window.showErrorMessage(
            "This command can only be executed from the Explorer context menu."
          );
          return;
        }
        await handleSplitFromClipboardToSelectedFolder(uri);
      }
    )
  );
}

export function deactivate() {}

async function handleSplitFromEditor(
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
    await splitFileContent(content, outputDir);
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

async function handleSplitFromClipboard(
  getOutputDir: () => Promise<string | undefined>
) {
  const content = await vscode.env.clipboard.readText();
  if (!content.trim()) {
    vscode.window.showErrorMessage("Clipboard is empty or has no text.");
    return;
  }

  const outputDir = await getOutputDir();
  if (!outputDir) {
    vscode.window.showWarningMessage("Operation canceled.");
    return;
  }

  try {
    await splitFileContent(content, outputDir);
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

async function handleSplitFromClipboardToSelectedFolder(uri: vscode.Uri) {
  const content = await vscode.env.clipboard.readText();
  if (!content.trim()) {
    vscode.window.showErrorMessage("Clipboard is empty or has no text.");
    return;
  }

  let dirPath = uri.fsPath;

  const stat = fs.lstatSync(uri.fsPath);
  if (stat.isFile()) {
    dirPath = path.dirname(dirPath);
  }

  try {
    await splitFileContent(content, dirPath);
    vscode.window.showInformationMessage(
      `Files successfully saved to ${dirPath}`
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

function getSameDirectory(
  editor: vscode.TextEditor
): Promise<string | undefined> {
  return Promise.resolve(path.dirname(editor.document.uri.fsPath));
}

async function splitFileContent(
  content: string,
  outputDir: string
): Promise<void> {
  const matches = Array.from(content.matchAll(splitPattern));
  if (matches.length === 0) {
    throw new Error("No delimiter comments found in the content.");
  }

  ensureDirectoryExists(outputDir);

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const [fullMatch, fileName] = match;
    const start = match.index! + fullMatch.length;
    const end = i < matches.length - 1 ? matches[i + 1].index! : content.length;
    const fileContent = content.substring(start, end).trim();

    if (fileContent) {
      await writeToFileAndFormatIfNeeded(outputDir, fileName, fileContent);
    }
  }
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function writeToFileAndFormatIfNeeded(
  outputDir: string,
  fileName: string,
  content: string
): Promise<void> {
  const filePath = path.join(outputDir, fileName);
  ensureDirectoryExists(path.dirname(filePath));

  let shouldWrite = true;
  if (fs.existsSync(filePath)) {
    const userChoice = await vscode.window.showInformationMessage(
      `File ${fileName} already exists. Overwrite?`,
      { modal: true },
      "Yes",
      "No"
    );

    if (userChoice !== "Yes") {
      vscode.window.showInformationMessage(`Skipped writing to ${fileName}`);
      shouldWrite = false;
    }
  }

  if (shouldWrite) {
    fs.writeFileSync(filePath, content, "utf8");
    await formatFileIfEnabled(filePath);
  }
}

async function formatFileIfEnabled(filePath: string) {
  const config = vscode.workspace.getConfiguration("gptCodeSlicer");
  const runFormatter = config.get<boolean>("runFormatterOnSave", false);
  if (!runFormatter) {
    return;
  }

  const doc = await vscode.workspace.openTextDocument(filePath);

  // Get editor settings for formatting
  const editorConfig = vscode.workspace.getConfiguration("editor", doc.uri);
  const tabSize = editorConfig.get<number>("tabSize", 2);
  const insertSpaces = editorConfig.get<boolean>("insertSpaces", true);

  const edits = (await vscode.commands.executeCommand(
    "vscode.executeFormatDocumentProvider",
    doc.uri,
    { insertSpaces, tabSize }
  )) as vscode.TextEdit[] | undefined;

  if (edits && edits.length > 0) {
    const edit = new vscode.WorkspaceEdit();
    for (const e of edits) {
      edit.replace(doc.uri, e.range, e.newText);
    }
    await vscode.workspace.applyEdit(edit);
    await doc.save();
  }
}
