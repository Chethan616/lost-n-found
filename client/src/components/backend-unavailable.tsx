import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackendUnavailable() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-6 w-6 text-muted-foreground" />
            <CardTitle>Backend Server Required</CardTitle>
          </div>
          <CardDescription>
            This application requires a backend server to function properly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Running on GitHub Pages</AlertTitle>
            <AlertDescription>
              You're viewing the static frontend hosted on GitHub Pages. 
              The backend API is not available in this environment.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold">To run the full application:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Clone the repository from GitHub</li>
              <li>Install dependencies: <code className="bg-muted px-2 py-1 rounded">npm install</code></li>
              <li>Start the development server: <code className="bg-muted px-2 py-1 rounded">npm run dev</code></li>
              <li>Open <code className="bg-muted px-2 py-1 rounded">http://localhost:5000</code> in your browser</li>
            </ol>
          </div>

          <div className="pt-4">
            <Button asChild className="w-full">
              <a 
                href="https://github.com/Chethan616/lost-n-found" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
