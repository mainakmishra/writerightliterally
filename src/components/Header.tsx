import { FileText, Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onClear: () => void;
  onExport: () => void;
  onImport: () => void;
  hasContent: boolean;
}

export function Header({ onClear, onExport, onImport, hasContent }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-lg leading-tight">WriteRight</h1>
            <p className="text-xs text-muted-foreground">AI Writing Assistant</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onImport}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            disabled={!hasContent}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!hasContent}
            className="text-muted-foreground hover:text-destructive gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
