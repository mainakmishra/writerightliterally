import { useRef } from 'react';
import { Header } from '@/components/Header';
import { Editor } from '@/components/Editor';
import { SuggestionsSidebar } from '@/components/SuggestionsSidebar';
import { StatsPanel } from '@/components/StatsPanel';
import { ToolsIconBar } from '@/components/ToolsIconBar';
import { useTextAnalysis } from '@/hooks/useTextAnalysis';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const {
    text,
    setText,
    suggestions,
    stats,
    overallScore,
    isAnalyzing,
    activeSuggestionId,
    setActiveSuggestionId,
    applySuggestion,
    dismissSuggestion,
    acceptAllSuggestions,
    reanalyze,
    clearText,
  } = useTextAnalysis();
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!text.trim()) return;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported!',
      description: 'Your document has been downloaded.',
    });
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
      toast({
        title: 'Imported!',
        description: `"${file.name}" has been loaded.`,
      });
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  };

  const handleClear = () => {
    if (!text.trim()) return;
    clearText();
    toast({
      title: 'Cleared',
      description: 'Your document has been cleared.',
    });
  };

  const handleApplyRewrite = (newText: string) => {
    setText(newText);
    toast({
      title: 'Applied!',
      description: 'Your text has been updated.',
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        onClear={handleClear}
        onExport={handleExport}
        onImport={handleImport}
        hasContent={!!text.trim()}
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        onChange={handleFileChange}
        className="hidden"
      />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Suggestions Sidebar - Left */}
        <SuggestionsSidebar
          suggestions={suggestions}
          onApply={applySuggestion}
          onDismiss={dismissSuggestion}
          onAcceptAll={acceptAllSuggestions}
          onReanalyze={reanalyze}
          activeSuggestionId={activeSuggestionId}
          isAnalyzing={isAnalyzing}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 gap-4 lg:gap-6 overflow-auto">
          {/* Stats Panel */}
          <StatsPanel stats={stats} overallScore={overallScore} />
          
          {/* Editor */}
          <Editor
            value={text}
            onChange={setText}
            suggestions={suggestions}
            onSuggestionClick={(suggestion) => setActiveSuggestionId(suggestion.id)}
          />
        </div>

        {/* Tools Icon Bar - Right */}
        <ToolsIconBar text={text} onApplyRewrite={handleApplyRewrite} />
      </main>
    </div>
  );
};

export default Index;
