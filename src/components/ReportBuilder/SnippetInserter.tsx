import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';

interface Snippet {
  id: string;
  name: string;
  shortcut: string;
  content: string;
  category: string;
  use_count: number;
}

interface SnippetInserterProps {
  onInsertSnippet: (content: string) => void;
  disabled?: boolean;
}

export const SnippetInserter = ({ onInsertSnippet, disabled }: SnippetInserterProps) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSnippets();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = snippets.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSnippets(filtered);
    } else {
      setFilteredSnippets(snippets);
    }
  }, [searchTerm, snippets]);

  const loadSnippets = async () => {
    try {
      const { data, error } = await supabase
        .from('report_snippets')
        .select('*')
        .order('use_count', { ascending: false });

      if (error) throw error;
      setSnippets(data || []);
      setFilteredSnippets(data || []);
    } catch (error) {
      console.error('Error loading snippets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load snippets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSnippet = async (snippetId: string) => {
    const snippet = snippets.find(s => s.id === snippetId);
    if (!snippet) return;

    try {
      // Increment use count
      await supabase
        .from('report_snippets')
        .update({ use_count: snippet.use_count + 1 })
        .eq('id', snippetId);

      onInsertSnippet(snippet.content);

      toast({
        title: 'Snippet Inserted',
        description: snippet.name,
      });

      setSearchTerm('');
    } catch (error) {
      console.error('Error inserting snippet:', error);
    }
  };

  const groupByCategory = () => {
    const groups: Record<string, Snippet[]> = {};
    filteredSnippets.forEach(snippet => {
      if (!groups[snippet.category]) {
        groups[snippet.category] = [];
      }
      groups[snippet.category].push(snippet);
    });
    return groups;
  };

  const snippetGroups = groupByCategory();

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search snippets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select onValueChange={handleSelectSnippet} disabled={disabled || loading}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Insert Snippet..." />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(snippetGroups).map(([category, categorySnippets]) => (
            <SelectGroup key={category}>
              <SelectLabel className="capitalize">{category}</SelectLabel>
              {categorySnippets.map((snippet) => (
                <SelectItem key={snippet.id} value={snippet.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span>{snippet.name}</span>
                    {snippet.shortcut && (
                      <Badge variant="outline" className="ml-2 font-mono text-xs">
                        {snippet.shortcut}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};