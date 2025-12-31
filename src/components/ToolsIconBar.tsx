import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  RefreshCw, 
  FileText, 
  User, 
  Shield, 
  CheckCircle, 
  BookOpen, 
  GraduationCap, 
  Users,
  X,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AIChat } from '@/components/tools/AIChat';
import { AIRewriter } from '@/components/tools/AIRewriter';
import { AIParaphraser } from '@/components/tools/AIParaphraser';
import { AIHumanizer } from '@/components/tools/AIHumanizer';
import { AIDetector } from '@/components/tools/AIDetector';
import { FactChecker } from '@/components/tools/FactChecker';
import { CitationFinder } from '@/components/tools/CitationFinder';
import { AIGrader } from '@/components/tools/AIGrader';
import { ReaderReactions } from '@/components/tools/ReaderReactions';

interface Tool {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface ToolsIconBarProps {
  text: string;
  onApplyRewrite: (newText: string) => void;
}

const tools: Tool[] = [
  { id: 'chat', label: 'AI Chat', icon: MessageSquare, description: 'Chat with AI' },
  { id: 'rewriter', label: 'Rewriter', icon: RefreshCw, description: 'Rewrite your text' },
  { id: 'paraphraser', label: 'Paraphraser', icon: FileText, description: 'Paraphrase content' },
  { id: 'humanizer', label: 'Humanizer', icon: User, description: 'Make text human-like' },
  { id: 'detector', label: 'AI Detector', icon: Shield, description: 'Detect AI content' },
  { id: 'factcheck', label: 'Fact Check', icon: CheckCircle, description: 'Verify facts' },
  { id: 'citation', label: 'Citations', icon: BookOpen, description: 'Find citations' },
  { id: 'grader', label: 'Grader', icon: GraduationCap, description: 'Grade your writing' },
  { id: 'reactions', label: 'Reactions', icon: Users, description: 'Reader reactions' },
];

export function ToolsIconBar({ text, onApplyRewrite }: ToolsIconBarProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const handleToolClick = (toolId: string) => {
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  const renderToolContent = () => {
    switch (activeTool) {
      case 'chat':
        return <AIChat text={text} />;
      case 'rewriter':
        return <AIRewriter text={text} onApply={onApplyRewrite} />;
      case 'paraphraser':
        return <AIParaphraser text={text} onApply={onApplyRewrite} />;
      case 'humanizer':
        return <AIHumanizer text={text} onApply={onApplyRewrite} />;
      case 'detector':
        return <AIDetector text={text} />;
      case 'factcheck':
        return <FactChecker text={text} />;
      case 'citation':
        return <CitationFinder text={text} />;
      case 'grader':
        return <AIGrader text={text} />;
      case 'reactions':
        return <ReaderReactions text={text} />;
      default:
        return null;
    }
  };

  const activeToolData = tools.find(t => t.id === activeTool);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-full">
        {/* Expanded Tool Panel */}
        {activeTool && (
          <div className="w-80 lg:w-96 bg-card border-l border-border flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                {activeToolData && (
                  <>
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <activeToolData.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{activeToolData.label}</h3>
                      <p className="text-xs text-muted-foreground">{activeToolData.description}</p>
                    </div>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setActiveTool(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderToolContent()}
            </div>
          </div>
        )}

        {/* Icon Bar */}
        <div className="w-16 bg-gradient-to-b from-card to-card/95 border-l border-border flex flex-col items-center py-4 gap-2">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Tools
          </div>
          
          {tools.map((tool) => {
            const isActive = activeTool === tool.id;
            
            return (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleToolClick(tool.id)}
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 relative overflow-hidden",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105" 
                        : "hover:bg-primary/10 text-muted-foreground hover:text-primary hover:scale-105"
                    )}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                    )}
                    <tool.icon className={cn(
                      "h-5 w-5 transition-all duration-300 relative z-10",
                      isActive && "drop-shadow-sm"
                    )} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={8} className="bg-popover border-border shadow-xl">
                  <div className="flex items-center gap-2">
                    <tool.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{tool.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          
          <div className="flex-1" />
          <div className="w-8 h-1 rounded-full bg-primary/20" />
        </div>
      </div>
    </TooltipProvider>
  );
}
