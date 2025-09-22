import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";

interface VerificationStep {
  name: string;
  progress: number;
  status: "pending" | "processing" | "complete";
}

interface VerificationResult {
  textSimilarity: number;
  imageSimilarity: number;
  finalScore: number;
  decision: "approved" | "rejected" | "manual_review";
  reason: string;
}

export function AIVerification() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const steps: VerificationStep[] = [
    { name: "Text Analysis", progress: 0, status: "pending" },
    { name: "Image Comparison", progress: 0, status: "pending" },
    { name: "Final Verification", progress: 0, status: "pending" },
  ];

  const [verificationSteps, setVerificationSteps] = useState(steps);

  // Demo verification process
  const startDemo = () => {
    setIsProcessing(true);
    setCurrentStep(0);
    setResult(null);
    setVerificationSteps(steps);

    // Simulate AI processing
    let stepIndex = 0;
    const processStep = () => {
      if (stepIndex < steps.length) {
        setVerificationSteps(prev => prev.map((step, index) => {
          if (index === stepIndex) {
            return { ...step, status: "processing" };
          }
          return step;
        }));

        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 10;
          setVerificationSteps(prev => prev.map((step, index) => {
            if (index === stepIndex) {
              return { ...step, progress };
            }
            return step;
          }));

          if (progress >= 100) {
            clearInterval(progressInterval);
            setVerificationSteps(prev => prev.map((step, index) => {
              if (index === stepIndex) {
                return { ...step, status: "complete", progress: 100 };
              }
              return step;
            }));

            stepIndex++;
            setCurrentStep(stepIndex);

            if (stepIndex < steps.length) {
              setTimeout(processStep, 500);
            } else {
              // Show final result
              setTimeout(() => {
                const mockResults: VerificationResult[] = [
                  {
                    textSimilarity: 0.92,
                    imageSimilarity: 0.96,
                    finalScore: 0.94,
                    decision: "approved",
                    reason: "High confidence match. Descriptions and evidence strongly align."
                  },
                  {
                    textSimilarity: 0.85,
                    imageSimilarity: 0.59,
                    finalScore: 0.72,
                    decision: "manual_review",
                    reason: "Moderate similarity detected. Manual review recommended for verification."
                  },
                  {
                    textSimilarity: 0.45,
                    imageSimilarity: 0.01,
                    finalScore: 0.23,
                    decision: "rejected",
                    reason: "Low similarity between claim and original item description."
                  }
                ];

                const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
                setResult(randomResult);
                setIsProcessing(false);
              }, 1000);
            }
          }
        }, 100);
      }
    };

    processStep();
  };

  const getStatusIcon = (decision: string) => {
    switch (decision) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-400" />;
      case "manual_review":
        return <Clock className="h-5 w-5 text-yellow-400" />;
      default:
        return <Search className="h-5 w-5 text-blue-400" />;
    }
  };

  const getStatusColor = (decision: string) => {
    switch (decision) {
      case "approved":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "manual_review":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    }
  };

  const formatDecision = (decision: string) => {
    switch (decision) {
      case "manual_review":
        return "Manual Review";
      default:
        return decision.charAt(0).toUpperCase() + decision.slice(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Scanner Animation */}
      <div className="relative bg-secondary rounded-xl p-8 overflow-hidden">
        <div className={`relative ai-scanner min-h-32 flex items-center justify-center ${isProcessing ? 'animate-pulse' : ''}`}>
          <div className="text-center">
            <div className={`mb-4 ${isProcessing ? 'animate-glow' : ''}`}>
              <Search className="h-12 w-12 text-blue-400 mx-auto" />
            </div>
            <h4 className="text-lg font-semibold mb-2">
              {isProcessing ? "AI Verification in Progress" : "AI Verification Demo"}
            </h4>
            <p className="text-muted-foreground">
              {isProcessing ? "Analyzing your claim evidence..." : "Click to see AI verification in action"}
            </p>
          </div>
        </div>
      </div>

      {/* Verification Steps */}
      <div className="space-y-4">
        {verificationSteps.map((step, index) => (
          <div key={step.name} className="space-y-2" data-testid={`verification-step-${index}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{step.name}</span>
              <div className="flex items-center space-x-2">
                {step.status === "complete" && <CheckCircle className="h-4 w-4 text-green-400" />}
                {step.status === "processing" && <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                <span className="text-xs text-muted-foreground">{step.progress}%</span>
              </div>
            </div>
            <Progress value={step.progress} className="h-2" data-testid={`verification-progress-${index}`} />
          </div>
        ))}
      </div>

      {/* Start Demo Button */}
      {!isProcessing && !result && (
        <button
          onClick={startDemo}
          className="w-full shiny-button py-3 rounded-xl font-medium"
          data-testid="button-start-verification-demo"
        >
          Start Verification Demo
        </button>
      )}

      {/* Verification Result */}
      {result && (
        <Card className={`border ${getStatusColor(result.decision)}`} data-testid="verification-result">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              {getStatusIcon(result.decision)}
              <h4 className="text-lg font-semibold ml-2" data-testid="verification-decision">
                {formatDecision(result.decision)}
              </h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted-foreground">Text Match</p>
                <p className="font-medium" data-testid="verification-text-similarity">
                  {Math.round(result.textSimilarity * 100)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Image Match</p>
                <p className="font-medium" data-testid="verification-image-similarity">
                  {Math.round(result.imageSimilarity * 100)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Final Score</p>
                <p className="font-medium" data-testid="verification-final-score">
                  {Math.round(result.finalScore * 100)}%
                </p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground" data-testid="verification-reason">
              {result.reason}
            </p>

            <button
              onClick={() => {
                setResult(null);
                setVerificationSteps(steps);
              }}
              className="mt-4 shiny-button px-6 py-2 rounded-lg font-medium"
              data-testid="button-reset-verification"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
