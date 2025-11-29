import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from '@/lib/toast';
import { handleError } from '@/utils/errorHandler';

interface Snippet {
  id: string;
  name: string;
  content: string;
  category: string;
  shortcut: string | null;
  use_count: number;
  created_at: string;
}

const CATEGORIES = [
  'anatomy',
  'pathology',
  'technique',
  'impression',
  'recommendations',
  'general',
];

export default function SnippetManager() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [deleteSnippet, setDeleteSnippet] = useState<Snippet | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'general',
    shortcut: '',
  });

  useEffect(() => {
    loadSnippets();
  }, []);

  useEffect(() => {
    filterSnippets();
  }, [snippets, searchQuery, categoryFilter]);

  const loadSnippets = async () => {
    try {
      const { data, error } = await supabase
        .from('report_snippets')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setSnippets(data || []);
    } catch (error) {
      handleError(error, 'Failed to load snippets');
    } finally {
      setLoading(false);
    }
  };

  const filterSnippets = () => {
    let filtered = [...snippets];

    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.shortcut && s.shortcut.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((s) => s.category === categoryFilter);
    }

    setFilteredSnippets(filtered);
  };

  const handleOpenDialog = (snippet?: Snippet) => {
    if (snippet) {
      setEditingSnippet(snippet);
      setFormData({
        name: snippet.name,
        content: snippet.content,
        category: snippet.category,
        shortcut: snippet.shortcut || '',
      });
    } else {
      setEditingSnippet(null);
      setFormData({
        name: '',
        content: '',
        category: 'general',
        shortcut: '',
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingSnippet(null);
    setFormData({
      name: '',
      content: '',
      category: 'general',
      shortcut: '',
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast.error('Name and content are required');
      return;
    }

    try {
      if (editingSnippet) {
        // Update existing snippet
        const { error } = await supabase
          .from('report_snippets')
          .update({
            name: formData.name,
            content: formData.content,
            category: formData.category,
            shortcut: formData.shortcut || null,
          })
          .eq('id', editingSnippet.id);

        if (error) throw error;

        toast.success('Snippet updated successfully');
      } else {
        // Create new snippet
        const { error } = await supabase
          .from('report_snippets')
          .insert({
            name: formData.name,
            content: formData.content,
            category: formData.category,
            shortcut: formData.shortcut || null,
          });

        if (error) throw error;

        toast.success('Snippet created successfully');
      }

      handleCloseDialog();
      loadSnippets();
    } catch (error) {
      handleError(error, 'Failed to save snippet');
    }
  };

  const handleDelete = async () => {
    if (!deleteSnippet) return;

    try {
      const { error } = await supabase
        .from('report_snippets')
        .delete()
        .eq('id', deleteSnippet.id);

      if (error) throw error;

      toast.success('Snippet deleted successfully');

      setDeleteSnippet(null);
      loadSnippets();
    } catch (error) {
      handleError(error, 'Failed to delete snippet');
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      anatomy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      pathology: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      technique: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      impression: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      recommendations: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[category] || colors.general;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading snippets...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Report Snippet Manager</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage reusable text macros for report building
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Snippet
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, content, or shortcut..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="min-w-[200px]">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snippets List */}
      <div className="grid gap-4">
        {filteredSnippets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No snippets found. Create your first snippet to get started.
            </CardContent>
          </Card>
        ) : (
          filteredSnippets.map((snippet) => (
            <Card key={snippet.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{snippet.name}</CardTitle>
                      <Badge className={getCategoryBadgeColor(snippet.category)}>
                        {snippet.category}
                      </Badge>
                      {snippet.shortcut && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {snippet.shortcut}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm line-clamp-2">
                      {snippet.content}
                    </CardDescription>
                    <div className="text-xs text-muted-foreground mt-2">
                      Used {snippet.use_count} times
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(snippet)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteSnippet(snippet)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSnippet ? 'Edit Snippet' : 'Create New Snippet'}
            </DialogTitle>
            <DialogDescription>
              {editingSnippet
                ? 'Update the snippet details below'
                : 'Fill in the details to create a new reusable snippet'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Normal TMJ Assessment"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortcut">Keyboard Shortcut (optional)</Label>
              <Input
                id="shortcut"
                value={formData.shortcut}
                onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                placeholder="e.g., /tmj or :normal"
              />
              <p className="text-xs text-muted-foreground">
                A quick way to insert this snippet (e.g., /tmj, :normal)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the snippet content..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingSnippet ? 'Update Snippet' : 'Create Snippet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSnippet} onOpenChange={() => setDeleteSnippet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snippet?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSnippet?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
