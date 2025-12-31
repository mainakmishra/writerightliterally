import { useState } from 'react';
import { BookOpen, ExternalLink, Search, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface CitationNeeded {
  text: string;
  reason: string;
  suggestedSources: string[];
  searchQuery: string;
}

interface CitationResult {
  citationsNeeded: CitationNeeded[];
  citationScore: number;
  recommendations: string[];
}

interface CitationFinderProps {
  text: string;
  onFind: (text: string) => Promise<CitationResult | null>;
  isLoading: boolean;
}

export function CitationFinder({ text, onFind, isLoading }: CitationFinderProps) {
  const [result, setResult] = useState<CitationResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
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
    const data = await onFind(text);
    if (data) {
      setResult(data);
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Citation Finder</h3>
        </div>
        <Button onClick={handleFind} disabled={isLoading || !text.trim()}>
          <Search className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Analyzing...' : 'Find Citations'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Identify claims that need citations and get suggestions for finding sources.
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
