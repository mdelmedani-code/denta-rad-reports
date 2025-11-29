import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface TemplateLibraryProps {
  templates: any[];
  onCreateNew: () => void;
  onSelectTemplate: (template: any) => void;
  onDeleteTemplate: (id: string) => void;
  onDuplicateTemplate: (id: string) => void;
}

export function TemplateLibrary({
  templates,
  onCreateNew,
  onSelectTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
}: TemplateLibraryProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const confirmDelete = () => {
    if (templateToDelete) {
      onDeleteTemplate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">PDF Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage customizable PDF report templates
            </p>
          </div>
          <Button onClick={onCreateNew} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Create New Template
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
            >
              <CardHeader onClick={() => onSelectTemplate(template)}>
                <div className="w-full h-48 bg-muted rounded flex items-center justify-center overflow-hidden">
                  {template.thumbnail_url ? (
                    <img 
                      src={template.thumbnail_url} 
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent onClick={() => onSelectTemplate(template)}>
                <h3 className="font-semibold text-lg">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {template.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Modified {new Date(template.updated_at).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {template.is_default && (
                    <Badge variant="default">Default</Badge>
                  )}
                  {template.is_published ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => onSelectTemplate(template)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDuplicateTemplate(template.id)}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setTemplateToDelete(template.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first PDF template to get started
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
