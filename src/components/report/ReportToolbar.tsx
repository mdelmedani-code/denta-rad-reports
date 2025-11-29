import { TemplateSelector } from '@/components/ReportBuilder/TemplateSelector';
import { SnippetInserter } from '@/components/ReportBuilder/SnippetInserter';

interface ReportToolbarProps {
  onSelectTemplate: (template: any) => void;
  onInsertSnippet: (content: string) => void;
  disabled?: boolean;
}

export const ReportToolbar = ({
  onSelectTemplate,
  onInsertSnippet,
  disabled = false,
}: ReportToolbarProps) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6 p-4 bg-muted/50 rounded-lg">
      <TemplateSelector onSelectTemplate={onSelectTemplate} disabled={disabled} />
      <SnippetInserter onInsertSnippet={onInsertSnippet} disabled={disabled} />
    </div>
  );
};
