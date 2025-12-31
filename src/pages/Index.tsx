import { useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Editor } from '@/components/Editor';
import { SuggestionsSidebar } from '@/components/SuggestionsSidebar';
import { StatsPanel } from '@/components/StatsPanel';
import { useTextAnalysis } from '@/hooks/useTextAnalysis';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIChat } from '@/components/tools/AIChat';
import { AIRewriter } from '@/components/tools/AIRewriter';
import { AIParaphraser } from '@/components/tools/AIParaphraser';
import { AIHumanizer } from '@/components/tools/AIHumanizer';
import { AIDetector } from '@/components/tools/AIDetector';
import { FactChecker } from '@/components/tools/FactChecker';
import { CitationFinder } from '@/components/tools/CitationFinder';
import { AIGrader } from '@/components/tools/AIGrader';
import { ReaderReactions } from '@/components/tools/ReaderReactions';
import { 
  MessageSquare, 
  RefreshCw, 
  FileText, 
  User, 
  Shield, 
  CheckCircle, 
  BookOpen, 
  GraduationCap, 
  Users 
} from 'lucide-react';

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
  const [activeToolTab, setActiveToolTab] = useState('chat');

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

  const tools = [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'rewriter', label: 'Rewriter', icon: RefreshCw },
    { id: 'paraphraser', label: 'Paraphraser', icon: FileText },
    { id: 'humanizer', label: 'Humanizer', icon: User },
    { id: 'detector', label: 'AI Detector', icon: Shield },
    { id: 'factcheck', label: 'Fact Check', icon: CheckCircle },
    { id: 'citation', label: 'Citations', icon: BookOpen },
    { id: 'grader', label: 'Grader', icon: GraduationCap },
    { id: 'reactions', label: 'Reactions', icon: Users },
  ];

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

      <main className="flex-1 flex flex-col lg:flex-row">
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

          {/* AI Tools Tabs */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Tabs value={activeToolTab} onValueChange={setActiveToolTab} className="w-full">
              <div className="border-b border-border overflow-x-auto">
                <TabsList className="h-auto p-1 bg-muted/50 rounded-none w-max min-w-full flex">
                  {tools.map((tool) => (
                    <TabsTrigger
                      key={tool.id}
                      value={tool.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <tool.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{tool.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              <div className="p-4">
                <TabsContent value="chat" className="mt-0">
                  <AIChat text={text} />
                </TabsContent>
                <TabsContent value="rewriter" className="mt-0">
                  <AIRewriter text={text} onApply={handleApplyRewrite} />
                </TabsContent>
                <TabsContent value="paraphraser" className="mt-0">
                  <AIParaphraser text={text} onApply={handleApplyRewrite} />
                </TabsContent>
                <TabsContent value="humanizer" className="mt-0">
                  <AIHumanizer text={text} onApply={handleApplyRewrite} />
                </TabsContent>
                <TabsContent value="detector" className="mt-0">
                  <AIDetector text={text} />
                </TabsContent>
                <TabsContent value="factcheck" className="mt-0">
                  <FactChecker text={text} />
                </TabsContent>
                <TabsContent value="citation" className="mt-0">
                  <CitationFinder text={text} />
                </TabsContent>
                <TabsContent value="grader" className="mt-0">
                  <AIGrader text={text} />
                </TabsContent>
                <TabsContent value="reactions" className="mt-0">
                  <ReaderReactions text={text} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Suggestions Sidebar */}
        <SuggestionsSidebar
          suggestions={suggestions}
          onApply={applySuggestion}
          onDismiss={dismissSuggestion}
          onAcceptAll={acceptAllSuggestions}
          onReanalyze={reanalyze}
          activeSuggestionId={activeSuggestionId}
          isAnalyzing={isAnalyzing}
        />
      </main>
    </div>
  );
};

export default Index;
