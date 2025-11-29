import { SnippetInserter } from '@/components/ReportBuilder/SnippetInserter';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface ReportToolbarProps {
  onInsertSnippet: (content: string) => void;
  onResetTemplate: () => void;
  disabled?: boolean;
}

export const ReportToolbar = ({
  onInsertSnippet,
  onResetTemplate,
  disabled = false,
}: ReportToolbarProps) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6 p-4 bg-muted/50 rounded-lg">
      <SnippetInserter onInsertSnippet={onInsertSnippet} disabled={disabled} />
      <Button
        variant="outline"
        size="sm"
        onClick={onResetTemplate}
        disabled={disabled}
        className="ml-auto"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset to Template
      </Button>
    </div>
  );
};
