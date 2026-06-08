import * as vscode from "vscode";

/**
 * Represents a frozen cursor position in a specific file.
 * Uses absolute offset instead of line/column to survive text mutations
 * without complex recalculation math.
 */
interface TimeAnchor {
  uri: vscode.Uri;
  offset: number;
}

/**
 * The frozen cursor positions across all files.
 * Each anchor stores the file URI and the absolute character offset.
 */
let alternativeTimeline: TimeAnchor[] = [];

/**
 * Tracks which files currently have time frozen.
 * Each entry is a URI string. Replaces a single global boolean
 * so each tab can be frozen independently.
 */
let frozenFiles: Set<string> = new Set();

/** Status bar item shown at the bottom right while a file is frozen. */
let anchronosStatusBarItem: vscode.StatusBarItem;

/**
 * The visual decoration applied to frozen anchor positions.
 * Stored as a mutable variable so it can be recreated when the user
 * changes the anchor color in settings without restarting VS Code.
 */
let stasisFieldDecoration: vscode.TextEditorDecorationType;

/**
 * Creates (or recreates) the anchor decoration type.
 * Reads the current `anchronos.anchorColor` setting each time it is called.
 * Disposes the previous decoration before creating the new one to avoid
 * leaving orphaned decorators in memory.
 */
function createDecoration(): vscode.TextEditorDecorationType {
  if (stasisFieldDecoration) {
    stasisFieldDecoration.dispose();
  }

  const config = vscode.workspace.getConfiguration("anchronos");
  const customColor = config.get<string>("anchorColor", "");

  const borderColor = customColor
    ? customColor
    : new vscode.ThemeColor("editorCursor.foreground");

  const backgroundColor = customColor
    ? `${customColor}33` // Same hue at ~20% opacity (hex 33 = 20% alpha)
    : new vscode.ThemeColor("editor.findMatchHighlightBackground");

  return vscode.window.createTextEditorDecorationType({
    border: "2px solid",
    borderColor,
    borderRadius: "1px",
    backgroundColor,
    overviewRulerColor: customColor
      ? customColor
      : new vscode.ThemeColor("minimap.findMatchHighlight"),
    overviewRulerLane: vscode.OverviewRulerLane.Full,
  });
}

export function activate(context: vscode.ExtensionContext) {
  stasisFieldDecoration = createDecoration();

  // Status bar item: shown at the right while a file is frozen.
  // Clicking it triggers toggleTimeFlow to unfreeze the current file.
  anchronosStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  anchronosStatusBarItem.command = "anchronos.toggleTimeFlow";
  context.subscriptions.push(anchronosStatusBarItem);

  /**
   * Shows an information message only if `anchronos.showNotifications` is true.
   * Centralizes all notifications so the setting is respected everywhere.
   */
  function notify(message: string) {
    const config = vscode.workspace.getConfiguration("anchronos");
    if (config.get<boolean>("showNotifications", true)) {
      vscode.window.showInformationMessage(message);
    }
  }

  /**
   * Renders the frozen anchor decorations in the given editor.
   * Converts each stored offset back to a VS Code Position for display.
   * Called after any state change that affects the current file's anchors.
   */
  function projectTimeRemnants(editor: vscode.TextEditor) {
    const fileAnchors = alternativeTimeline.filter(
      (anchor) => anchor.uri.toString() === editor.document.uri.toString(),
    );

    const visualParadoxes = fileAnchors.map((anchor) => {
      const currentPosition = editor.document.positionAt(anchor.offset);
      return new vscode.Range(currentPosition, currentPosition);
    });

    editor.setDecorations(stasisFieldDecoration, visualParadoxes);
  }

  /**
   * Updates the status bar item for the currently active editor.
   * Shows the anchor count if the file is frozen; hides it otherwise.
   */
  function updateStatusBar() {
    const editor = vscode.window.activeTextEditor;
    const uri = editor?.document.uri.toString();

    if (!editor || !uri || !frozenFiles.has(uri)) {
      anchronosStatusBarItem.hide();
      return;
    }

    const fileAnchorsCount = alternativeTimeline.filter(
      (anchor) => anchor.uri.toString() === uri,
    ).length;

    anchronosStatusBarItem.text = `⌛ $(clockface) Anchronos: ${fileAnchorsCount} Paradoxes`;
    anchronosStatusBarItem.tooltip =
      "Click to unfreeze time and release cursors";
    anchronosStatusBarItem.show();
  }

  /**
   * Checks whether a frozen file has run out of anchors and shuts it down if so.
   * Called after every operation that can remove anchors (butterfly effect,
   * manual toggle, clear commands) to enforce the auto-shutdown rule.
   *
   * @param fileUri - The URI string of the file to check.
   */
  function checkAutoShutdown(fileUri: string) {
    if (!frozenFiles.has(fileUri)) {
      return;
    }

    const remainingAnchors = alternativeTimeline.filter(
      (a) => a.uri.toString() === fileUri,
    );

    if (remainingAnchors.length === 0) {
      frozenFiles.delete(fileUri);

      const activeUri = vscode.window.activeTextEditor?.document.uri.toString();
      if (activeUri === fileUri) {
        vscode.commands.executeCommand("setContext", "inTimeStasis", false);
        notify("▶️ Anchronos: Empty timeline. Time resumed automatically.");
      }
    }
  }

  /**
   * Listener: recalculates anchor offsets whenever the document text changes.
   *
   * Uses the raw rangeOffset and text length from each content change to shift
   * anchors that sit after the edit point — no line/column math required.
   *
   * Also applies two core business rules:
   * - Butterfly Effect: if the text at an anchor's exact position is deleted,
   *   that anchor is removed from the timeline.
   * - Paradox Unification: if two anchors land on the same offset after an edit,
   *   they are merged into one to avoid duplicate cursors on unfreeze.
   */
  const timeWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.contentChanges.length === 0) {
      return;
    }

    let correctedTimeline: TimeAnchor[] = [];

    for (const anchor of alternativeTimeline) {
      if (anchor.uri.toString() !== event.document.uri.toString()) {
        correctedTimeline.push(anchor);
        continue;
      }

      let currentOffset = anchor.offset;
      let destroyedByButterflyEffect = false;

      for (const change of event.contentChanges) {
        const paradoxStart = change.rangeOffset;
        const paradoxEnd = change.rangeOffset + change.rangeLength;

        // Butterfly Effect: the exact character the anchor sat on was deleted
        if (paradoxStart <= currentOffset && paradoxEnd > currentOffset) {
          destroyedByButterflyEffect = true;
          break;
        }

        // Shift the offset to account for inserted or removed characters
        if (paradoxStart <= currentOffset) {
          currentOffset += change.text.length - change.rangeLength;
        }
      }

      if (!destroyedByButterflyEffect) {
        correctedTimeline.push({
          uri: anchor.uri,
          offset: Math.max(0, currentOffset),
        });
      }
    }

    // Paradox Unification: deduplicate anchors that collided on the same offset
    alternativeTimeline = correctedTimeline.filter(
      (anchor, index, self) =>
        index ===
        self.findIndex(
          (a) =>
            a.uri.toString() === anchor.uri.toString() &&
            a.offset === anchor.offset,
        ),
    );

    checkAutoShutdown(event.document.uri.toString());

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document === event.document) {
      projectTimeRemnants(editor);
      updateStatusBar();
    }
  });

  /**
   * Listener: syncs decorations and the `inTimeStasis` context when the user
   * switches to a different tab. Ensures Alt+A is only active when the
   * newly focused file is actually frozen.
   */
  const editorWatcher = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      projectTimeRemnants(editor);
      const isFrozen = frozenFiles.has(editor.document.uri.toString());
      vscode.commands.executeCommand("setContext", "inTimeStasis", isFrozen);
      updateStatusBar();
    }
  });

  /**
   * Listener: cleans up anchors and frozen state when a file is closed.
   * Prevents orphaned anchors from accumulating in memory for tabs the user
   * has already closed without unfreezing.
   *
   * Note: VS Code also fires this event on internal reloads (e.g. language
   * mode changes). The effect is harmless — the file simply loses its anchors
   * and will start fresh if reopened.
   */
  const closeWatcher = vscode.workspace.onDidCloseTextDocument((document) => {
    const uri = document.uri.toString();

    alternativeTimeline = alternativeTimeline.filter(
      (a) => a.uri.toString() !== uri,
    );

    frozenFiles.delete(uri);

    const activeUri = vscode.window.activeTextEditor?.document.uri.toString();
    if (activeUri === uri) {
      vscode.commands.executeCommand("setContext", "inTimeStasis", false);
    }

    updateStatusBar();
  });

  /**
   * Listener: recreates the decoration type when the user changes
   * `anchronos.anchorColor` in settings. Re-projects anchors in all
   * currently visible editors so the color update is instant.
   */
  const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("anchronos.anchorColor")) {
      stasisFieldDecoration = createDecoration();

      vscode.window.visibleTextEditors.forEach((editor) => {
        projectTimeRemnants(editor);
      });
    }
  });

  /**
   * Command: anchronos.toggleTimeFlow (Alt+L)
   *
   * Freeze: captures all current cursors as anchors for the active file,
   * adds the file to frozenFiles, and leaves a single free cursor so the
   * user can navigate without losing their frozen positions.
   *
   * Unfreeze: materializes all stored anchors as real VS Code multi-cursors,
   * removes the file's anchors from the timeline, and removes it from frozenFiles.
   * Only affects the active file — anchors in other frozen tabs are preserved.
   */
  const toggleTimeFlow = vscode.commands.registerCommand(
    "anchronos.toggleTimeFlow",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const fileUri = editor.document.uri.toString();
      const isCurrentFileFrozen = frozenFiles.has(fileUri);

      if (!isCurrentFileFrozen) {
        editor.selections.forEach((selection) => {
          const absoluteOffset = editor.document.offsetAt(selection.active);
          alternativeTimeline.push({
            uri: editor.document.uri,
            offset: absoluteOffset,
          });
        });

        frozenFiles.add(fileUri);

        const lastActive =
          editor.selections[editor.selections.length - 1].active;
        editor.selections = [new vscode.Selection(lastActive, lastActive)];

        projectTimeRemnants(editor);
        vscode.commands.executeCommand("setContext", "inTimeStasis", true);
        notify("⌛ Anchronos: Time frozen! Stasis mode active.");
      } else {
        const fileAnchors = alternativeTimeline.filter(
          (anchor) => anchor.uri.toString() === fileUri,
        );

        if (fileAnchors.length > 0) {
          editor.selections = fileAnchors.map((anchor) => {
            const pos = editor.document.positionAt(anchor.offset);
            return new vscode.Selection(pos, pos);
          });

          alternativeTimeline = alternativeTimeline.filter(
            (anchor) => anchor.uri.toString() !== fileUri,
          );

          editor.setDecorations(stasisFieldDecoration, []);
        }

        frozenFiles.delete(fileUri);
        vscode.commands.executeCommand("setContext", "inTimeStasis", false);
        notify("▶️ Anchronos: Time flow restored.");
      }

      updateStatusBar();
    },
  );

  /**
   * Command: anchronos.plantParadox (Alt+A, only when inTimeStasis)
   *
   * Single cursor: toggles the anchor at the current position — adds it if
   * it doesn't exist, removes it if it does. Triggers auto-shutdown if the
   * last anchor for this file is removed.
   *
   * Multiple cursors (after Ctrl+D or Alt+Click): absorbs all native VS Code
   * cursors into the frozen timeline and collapses back to a single free
   * cursor, letting the user keep navigating.
   */
  const plantParadox = vscode.commands.registerCommand(
    "anchronos.plantParadox",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const fileUri = editor.document.uri.toString();

      if (!frozenFiles.has(fileUri)) {
        vscode.window.showWarningMessage(
          "❌ Freeze time first (Alt+L) before planting anchors.",
        );
        return;
      }

      if (editor.selections.length > 1) {
        // Absorb all native multi-cursors into the frozen timeline
        editor.selections.forEach((selection) => {
          const offset = editor.document.offsetAt(selection.active);
          const exists = alternativeTimeline.some(
            (a) => a.uri.toString() === fileUri && a.offset === offset,
          );

          if (!exists) {
            alternativeTimeline.push({ uri: editor.document.uri, offset });
          }
        });

        const lastActive =
          editor.selections[editor.selections.length - 1].active;
        editor.selections = [new vscode.Selection(lastActive, lastActive)];
      } else {
        // Toggle the anchor at the single cursor position
        const cursorPosition = editor.selection.active;
        const absoluteOffset = editor.document.offsetAt(cursorPosition);

        const existingIndex = alternativeTimeline.findIndex(
          (a) => a.uri.toString() === fileUri && a.offset === absoluteOffset,
        );

        if (existingIndex !== -1) {
          alternativeTimeline.splice(existingIndex, 1);
        } else {
          alternativeTimeline.push({
            uri: editor.document.uri,
            offset: absoluteOffset,
          });
        }
      }

      projectTimeRemnants(editor);
      checkAutoShutdown(fileUri);
      updateStatusBar();
    },
  );

  /**
   * Command: anchronos.clearCurrentAnchors
   *
   * Removes all anchors for the active file and exits freeze mode for it,
   * without materializing the cursors (unlike toggleTimeFlow which restores them).
   * Useful for discarding a session without triggering a multi-cursor edit.
   */
  const clearCurrentAnchors = vscode.commands.registerCommand(
    "anchronos.clearCurrentAnchors",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const fileUri = editor.document.uri.toString();

      alternativeTimeline = alternativeTimeline.filter(
        (a) => a.uri.toString() !== fileUri,
      );

      frozenFiles.delete(fileUri);
      editor.setDecorations(stasisFieldDecoration, []);
      vscode.commands.executeCommand("setContext", "inTimeStasis", false);
      notify("🗑️ Anchronos: Current file anchors cleared.");
      updateStatusBar();
    },
  );

  /**
   * Command: anchronos.clearAllAnchors
   *
   * Nuclear reset. Clears the entire timeline and frozenFiles set.
   * Removes decorations from all currently visible editors.
   * Use when the extension state feels inconsistent or to start fresh.
   */
  const clearAllAnchors = vscode.commands.registerCommand(
    "anchronos.clearAllAnchors",
    () => {
      alternativeTimeline = [];
      frozenFiles.clear();

      vscode.window.visibleTextEditors.forEach((editor) => {
        editor.setDecorations(stasisFieldDecoration, []);
      });

      vscode.commands.executeCommand("setContext", "inTimeStasis", false);
      notify("💥 Anchronos: All anchors destroyed. Timeline is clean.");
      updateStatusBar();
    },
  );

  context.subscriptions.push(
    timeWatcher,
    editorWatcher,
    closeWatcher,
    configWatcher,
    toggleTimeFlow,
    plantParadox,
    clearCurrentAnchors,
    clearAllAnchors,
  );
}

/** Called by VS Code when the extension is deactivated. No cleanup needed
 *  beyond what context.subscriptions handles automatically. */
export function deactivate() {}
