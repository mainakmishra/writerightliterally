import { useState } from 'react';
import { Shuffle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ParaphraseVersion {
  text: string;
  tone: string;
  description: string;
}

interface ParaphraseResult {
  versions: ParaphraseVersion[];
}

interface AIParaphraserProps {
  text: string;
  onParaphrase: (text: string) => Promise<ParaphraseResult | null>;
  onApply: (newText: string) => void;
  isLoading: boolean;
}

export function AIParaphraser({ text, onParaphrase, onApply, isLoading }: AIParaphraserProps) {
  const [result, setResult] = useState<ParaphraseResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const handleParaphrase = async () => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'No text to paraphrase',
        description: 'Please enter some text in the editor first.',
      });
      return;
    }
    const data = await onParaphrase(text);
    if (data) {
      setResult(data);
    }
  };

  const handleCopy = async (index: number, textToCopy: string) => {
    await navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApply = (newText: string) => {
    onApply(newText);
    toast({
      title: 'Applied!',
      description: 'The paraphrased text has been applied to the editor.',
    });
  };

  const getToneColor = (tone: string) => {
    switch (tone.toLowerCase()) {
      case 'formal': return 'bg-blue-500/10 text-blue-600';
      case 'casual': return 'bg-green-500/10 text-green-600';
      case 'academic': return 'bg-purple-500/10 text-purple-600';
      case 'creative': return 'bg-orange-500/10 text-orange-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shuffle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Paraphraser</h3>
        </div>
        <Button onClick={handleParaphrase} disabled={isLoading || !text.trim()}>
          <Shuffle className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Paraphrasing...' : 'Paraphrase'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Get multiple versions of your text in different tones and styles.
      </p>

      {result?.versions && (
        <div className="space-y-3">
          {result.versions.map((version, i) => (
            <Card key={i} className="p-4 space-y-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center justify-between">
                <Badge className={getToneColor(version.tone)}>
                  {version.tone}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopy(i, version.text)}>
                    {copiedIndex === i ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" onClick={() => handleApply(version.text)}>
                    Apply
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{version.description}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{version.text}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
