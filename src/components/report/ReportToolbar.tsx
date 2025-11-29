import { SnippetInserter } from '@/components/ReportBuilder/SnippetInserter';

interface ReportToolbarProps {
  onInsertSnippet: (content: string) => void;
  disabled?: boolean;
}

export const ReportToolbar = ({
  onInsertSnippet,
  disabled = false,
}: ReportToolbarProps) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6 p-4 bg-muted/50 rounded-lg">
      <SnippetInserter onInsertSnippet={onInsertSnippet} disabled={disabled} />
    </div>
  );
};
