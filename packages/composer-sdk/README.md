# @prism/composer-sdk

Prism Composer SDK — PS-style interactive canvas for mall frontend integration. Provides `ComposerCanvas` and `ComposerParams` components for real-time preview, plus `LayerPanel` for layer management.

## Installation

```bash
pnpm add @prism/composer-sdk
```

## Basic Usage

```tsx
import { ComposerCanvas, ComposerParams, LayerPanel } from '@prism/composer-sdk';

function App() {
  const template = {
    id: 'tpl-1',
    name: 'My Template',
    version: '1.0.0',
    content: {
      inputs: [
        { id: 'name', label: 'Name', type: 'text', defaultValue: 'World' },
      ],
      designParams: [
        { id: 'scale', label: 'Scale', type: 'number', defaultValue: 1, min: 0, max: 2 },
      ],
      layers: [
        {
          id: 'layer-1',
          name: 'Background',
          imageUrl: 'https://example.com/bg.png',
          x: 0, y: 0, scale: 1, rotation: 0, opacity: 1,
          blendMode: 'normal', visible: true, locked: false,
        },
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <>
      <ComposerParams template={template} />
      <ComposerCanvas
        template={template}
        width={800}
        height={600}
        onChange={(state) => console.log('State changed:', state)}
        onSubmit={(params) => console.log('Submitted:', params)}
      />
      <LayerPanel />
    </>
  );
}
```

## Props

### ComposerCanvas / ComposerSDKProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `template` | `ProductTemplate` | required | Template configuration from Prism API |
| `initialState` | `Partial<ComposerState>` | — | Initial state override |
| `onChange` | `(state) => void` | — | Fired when state changes (debounced 100ms) |
| `onSubmit` | `(params) => void` | — | Fired when user confirms |
| `width` | `number` | `800` | Canvas width in pixels |
| `height` | `number` | `600` | Canvas height in pixels |
| `backgroundColor` | `string` | `'#ffffff'` | Canvas background color |

### ComposerParams

Renders form controls for the template's `inputs` and `designParams`. Updates the store on user input.

### LayerPanel

Renders a layer list with selection, visibility toggle, and lock controls. Supports drag-and-drop reordering.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo last action |
| `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` | Redo |
| `Delete` / `Backspace` | Remove selected layer |
| `Arrow Keys` | Nudge selected layer by 1px |
| `Shift + Arrow Keys` | Nudge selected layer by 10px |

Shortcuts are disabled when an input field is focused.

## State Management

The SDK uses Zustand for state. Access the store directly:

```tsx
import { useComposerStore } from '@prism/composer-sdk';

function CustomControls() {
  const undo = useComposerStore((s) => s.undo);
  const redo = useComposerStore((s) => s.redo);
  const canUndo = useComposerStore((s) => s.canUndo());
  const canRedo = useComposerStore((s) => s.canRedo());

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

The store also supports `useKeyboardShortcuts()` hook to automatically bind the keyboard shortcuts to the window.

## Layer State

Each layer supports:
- Position (`x`, `y`)
- Scale and rotation
- Opacity and blend mode
- Visibility toggle
- Lock to prevent editing
- Optional mask (brightness, gradient, or feather)

## Mask Support

Apply a mask to the composite result:

```tsx
import { useComposerStore } from '@prism/composer-sdk';

function MaskControls() {
  const applyMask = useComposerStore((s) => s.applyMask);
  const setActiveMask = useComposerStore((s) => s.setActiveMask);

  return (
    <button
      onClick={() =>
        applyMask({
          type: 'gradient',
          startPoint: { x: 0, y: 0 },
          endPoint: { x: 800, y: 600 },
        })
      }
    >
      Apply Gradient Mask
    </button>
  );
}
```

## Browser Pixel Consistency

The SDK uses `@prism/image-ops/browser` executor for compositing, ensuring cross-platform pixel-level consistency with the server-side `sharp` executor used for production render.

## License

Private — Prism Editor
