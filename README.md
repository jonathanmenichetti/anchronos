# Anchronos

**Never lose your multi-cursors again.**

Freeze your cursors in time, roam freely through your code, and release them all at once.

---

## The Problem

You're using `Ctrl+D` to build up multiple cursors across a file. Everything is going great — until you need to also grab a position three hundred lines away, or one that has a slightly different name. The moment you click or arrow away, **all your cursors are gone**.

Anchronos solves this. It lets you **freeze** your cursor positions into anchors, **travel** anywhere in the file with a single free cursor, plant more anchors along the way, and then **unfreeze** — materializing every anchor simultaneously as real VS Code multi-cursors.

---

## Demo

![Anchronos in action](images/demo.gif)

---

## How It Works

Anchronos has two modes:

| Mode       | What you can do                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Normal** | Edit as usual. Use `Alt+L` to freeze your current cursors.                                                                           |
| **Stasis** | One free cursor. Navigate anywhere. Use `Alt+A` to plant or remove anchors. Use `Alt+L` to unfreeze and release all cursors at once. |

---

## Use Cases

### Renaming inconsistent variables

A file where three developers used three different names for the same concept. `Ctrl+D` won't help because the names don't match.

```typescript
function getUserData(userId: string) {
  const userResult = fetchUser(userId);
  return userResult;
}

function getMemberProfile(memberId: string) {
  const memberResult = fetchMember(memberId);
  return memberResult;
}

function getAccountInfo(accountId: string) {
  const accountResult = fetchAccount(accountId);
  return accountResult;
}
```

**Flow:** `Ctrl+D` on `userId` → `Alt+L` to freeze → navigate to `memberId` → `Alt+A` → navigate to `accountId` → `Alt+A` → `Alt+L` to release → type `profileId`. All three update at once.

---

### Adding a namespace prefix to selective imports

You want to prefix specific imports but skip others in between.

```typescript
import { Button } from "./components";
import { Modal } from "./components";
import { Input } from "./components";
import { Dropdown } from "./components";
import { Helper } from "./utils"; // skip this one
import { Tooltip } from "./components";
```

**Flow:** Freeze on the first four `{` from `./components` → navigate to the last one skipping `./utils` → `Alt+A` → `Alt+L` → type `UI.`. Five imports updated, one untouched.

---

### Inserting debug lines at the start of specific functions

You want to add a `console.log` at the top of three functions but not all of them.

```typescript
function calculatePrice(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function applyDiscount(price, code) {
  return price * discountMap[code];
}

function formatCurrency(amount) {
  // skip this one
  return `$${amount.toFixed(2)}`;
}

function calculateTax(price, region) {
  return price * taxRates[region];
}
```

**Flow:** Freeze at the start of line 2 `Alt+L` → navigate to line 6 → `Alt+A` → navigate to line 14 → `Alt+A` → `Alt+L` → type `console.log('called');`. Three functions instrumented, one skipped.

---

## Keybindings

| Shortcut | Command                          | When             |
| -------- | -------------------------------- | ---------------- |
| `Alt+L`  | Freeze / Unfreeze time           | Editor focused   |
| `Alt+A`  | Plant or remove anchor at cursor | Stasis mode only |

---

## Commands

All commands are available via the Command Palette (`Ctrl+Shift+P`):

| Command                                        | Description                                                 |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `Anchronos: Alternate Time Flow`               | Freeze or unfreeze the current file                         |
| `Anchronos: Plant Paradox`                     | Add or remove an anchor at the cursor position              |
| `Anchronos: Clear Anchors in Current File`     | Discard all anchors for this file without releasing cursors |
| `Anchronos: Clear All Anchors (Nuclear Reset)` | Wipe all anchors across every open file                     |

---

## Settings

| Setting                       | Type      | Default | Description                                                                                             |
| ----------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `anchronos.showNotifications` | `boolean` | `true`  | Show status messages when freezing or unfreezing. Disable if you use it heavily.                        |
| `anchronos.anchorColor`       | `string`  | `""`    | Custom hex color for anchor decorations (e.g. `#FF6B6B`). Leave empty to use your theme's cursor color. |

---

## How Anchors Stay Accurate

Anchronos stores cursor positions as **absolute character offsets** rather than line/column pairs. When you type or delete text before an anchor, the extension automatically shifts its offset to compensate — no manual recalculation needed.

Two additional rules keep the timeline clean:

- **Butterfly Effect** — if you delete the exact text where an anchor sits, that anchor is removed automatically.
- **Paradox Unification** — if two anchors collide on the same offset after an edit, they merge into one.

---

## Each File Is Independent

Freezing time in one file does not affect any other open tab. You can have multiple files frozen simultaneously with their own independent anchor sets.

---

## License

MIT
