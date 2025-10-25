import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  onPreviewPDF?: () => void;
  onFinalize?: () => void;
  onOpenTemplates?: () => void;
  onOpenSnippets?: () => void;
  onInsertImage?: () => void;
  onSign?: () => void;
}

export const KeyboardShortcuts = ({
  open,
  onOpenChange,
  onSave,
  onPreviewPDF,
  onFinalize,
  onOpenTemplates,
  onOpenSnippets,
  onInsertImage,
  onSign,
}: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Show shortcuts help with "?"
      if (e.key === '?' && !e.shiftKey && !modifier) {
        e.preventDefault();
        onOpenChange(true);
        return;
      }

      if (!modifier) return;

      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          onSave?.();
          break;
        case 'p':
          e.preventDefault();
          onPreviewPDF?.();
          break;
        case 'enter':
          if (e.shiftKey) {
            e.preventDefault();
            onFinalize?.();
          }
          break;
        case 't':
          if (e.shiftKey) {
            e.preventDefault();
            onOpenTemplates?.();
          }
          break;
        case 's':
          if (e.shiftKey) {
            e.preventDefault();
            onOpenSnippets?.();
          }
          break;
        case 'i':
          if (e.shiftKey) {
            e.preventDefault();
            onInsertImage?.();
          }
          break;
        case 'g':
          if (e.shiftKey) {
            e.preventDefault();
            onSign?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onPreviewPDF, onFinalize, onOpenTemplates, onOpenSnippets, onInsertImage, onSign]);

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { category: 'General', items: [
      { keys: '?', description: 'Show keyboard shortcuts' },
      { keys: `${modKey} + S`, description: 'Save draft' },
      { keys: `${modKey} + P`, description: 'Preview PDF' },
      { keys: `${modKey} + Shift + Enter`, description: 'Generate & Finalize' },
    ]},
    { category: 'Content', items: [
      { keys: `${modKey} + Shift + T`, description: 'Open template selector' },
      { keys: `${modKey} + Shift + S`, description: 'Open snippet inserter' },
      { keys: `${modKey} + Shift + I`, description: 'Insert image' },
      { keys: '//', description: 'Quick snippet search (type in editor)' },
    ]},
    { category: 'Text Formatting', items: [
      { keys: `${modKey} + B`, description: 'Bold' },
      { keys: `${modKey} + I`, description: 'Italic' },
      { keys: `${modKey} + U`, description: 'Underline' },
      { keys: `${modKey} + K`, description: 'Insert link' },
      { keys: `${modKey} + Shift + 1-5`, description: 'Headings' },
    ]},
    { category: 'Signature', items: [
      { keys: `${modKey} + Shift + G`, description: 'Sign report' },
    ]},
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold mb-3">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {shortcut.keys}
                    </Badge>
                  </div>
                ))}
              </div>
              {section.category !== shortcuts[shortcuts.length - 1].category && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p>💡 <strong>Tip:</strong> Press <Badge variant="outline" className="mx-1">?</Badge> at any time to show this help</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};