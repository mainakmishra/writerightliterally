import { useState } from 'react';
import { BookOpen, ExternalLink, Search, Copy, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CitationNeeded {
  text: string;
  reason: string;
  suggestedSources: string[];
  searchQuery: string;
  foundSources?: string[];
}

interface CitationResult {
  citationsNeeded: CitationNeeded[];
  citationScore: number;
  recommendations: string[];
}

interface CitationFinderProps {
  text: string;
}

export function CitationFinder({ text }: CitationFinderProps) {
  const [result, setResult] = useState<CitationResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFind = async () => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'No text to analyze',
        description: 'Please enter some text in the editor first.',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Use Perplexity for web-powered citation finding
      const { data, error } = await supabase.functions.invoke('perplexity-search', {
        body: { type: 'find-citations', text },
      });

      if (error) throw error;
      
      if (data && Array.isArray(data.citationsNeeded) && typeof data.citationScore === 'number') {
        setResult(data);
      } else {
        throw new Error('Invalid response. Please try again.');
      }
    } catch (error: any) {
      console.error('Citation finder error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyQuery = async (index: number, query: string) => {
    await navigator.clipboard.writeText(query);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSearch = (query: string) => {
    window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Citation Finder</h3>
          <Badge variant="secondary" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            Web Search
          </Badge>
        </div>
        <Button onClick={handleFind} disabled={isLoading || !text.trim()}>
          <Search className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Searching...' : 'Find Citations'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Search the web to find citations and sources for your claims.
      </p>

      {result && (
        <div className="space-y-4 animate-fade-in">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Citation Coverage</span>
              <span className="text-lg font-bold text-primary">{result.citationScore}%</span>
            </div>
            <Progress value={result.citationScore} className="h-3" />
          </Card>

          {result.citationsNeeded.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Citations needed ({result.citationsNeeded.length}):</p>
              {result.citationsNeeded.map((citation, i) => (
                <Card key={i} className="p-3 space-y-3">
                  <p className="text-sm font-medium text-foreground">"{citation.text}"</p>
                  <p className="text-xs text-muted-foreground">{citation.reason}</p>
                  
                  <div className="flex flex-wrap gap-1">
                    {citation.suggestedSources.map((source, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>

                  {citation.foundSources && citation.foundSources.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground w-full">Found sources:</span>
                      {citation.foundSources.map((source, j) => (
                        <Button
                          key={j}
                          variant="outline"
                          size="sm"
                          className="text-xs h-6"
                          onClick={() => window.open(source, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Source {j + 1}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Search:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {citation.searchQuery}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopyQuery(i, citation.searchQuery)}
                    >
                      {copiedIndex === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleSearch(citation.searchQuery)}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {result.recommendations.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-medium mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
