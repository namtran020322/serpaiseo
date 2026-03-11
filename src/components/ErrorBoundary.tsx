import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageContext } from "@/contexts/LanguageContext";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  static contextType = LanguageContext;
  declare context: React.ContextType<typeof LanguageContext>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const t = this.context?.t || ((key: string) => {
        const fallbacks: Record<string, string> = {
          "errorBoundary.title": "Something went wrong",
          "errorBoundary.description": "An unexpected error occurred. Please reload the page to continue.",
          "errorBoundary.reload": "Reload Page",
        };
        return fallbacks[key] || key;
      });

      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center space-y-4 p-8 max-w-md">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">
              {t("errorBoundary.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("errorBoundary.description")}
            </p>
            <Button onClick={this.handleReload} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("errorBoundary.reload")}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
