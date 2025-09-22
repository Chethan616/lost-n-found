import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertClaimSchema } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, Shield, Loader2, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { type ItemWithUser } from "@shared/schema";

const claimFormSchema = insertClaimSchema;

type ClaimFormData = z.infer<typeof claimFormSchema>;

interface VerificationResult {
  textSimilarity: number;
  imageSimilarity: number;
  finalScore: number;
  decision: "approved" | "rejected" | "manual_review";
  reason: string;
}

export function ClaimForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get available items to claim
  const { data: items = [] } = useQuery<ItemWithUser[]>({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const res = await fetch("/api/items?type=lost", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      itemId: "",
      evidenceText: "",
    },
  });

  const createClaimMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/claims", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Check if claim was approved by AI
      if (data.decision === "approved") {
        toast({
          title: "Claim Approved! 🎉",
          description: "Your claim has been automatically approved by AI verification.",
        });
        setVerificationResult({
          textSimilarity: data.textSimilarity || 0,
          imageSimilarity: data.imageSimilarity || 0,
          finalScore: data.aiScore || 0,
          decision: data.decision,
          reason: data.reason || "Claim automatically approved"
        });
      } else if (data.decision === "manual_review") {
        toast({
          title: "Claim Submitted for Review",
          description: "Your claim requires manual review. We'll notify you of the decision.",
        });
        setVerificationResult({
          textSimilarity: data.textSimilarity || 0,
          imageSimilarity: data.imageSimilarity || 0,
          finalScore: data.aiScore || 0,
          decision: data.decision,
          reason: data.reason || "Manual review required"
        });
      } else {
        toast({
          title: "Claim Rejected",
          description: data.reason || "Your claim was not approved by AI verification.",
          variant: "destructive",
        });
        setVerificationResult({
          textSimilarity: data.textSimilarity || 0,
          imageSimilarity: data.imageSimilarity || 0,
          finalScore: data.aiScore || 0,
          decision: data.decision,
          reason: data.reason || "Claim rejected"
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      setIsVerifying(false);
      
      // Reset form only on approval or manual review, not on rejection
      if (data.decision !== "rejected") {
        form.reset();
        setSelectedFile(null);
        setSelectedItemId("");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsVerifying(false);
    },
  });

  const onSubmit = (data: ClaimFormData) => {
    if (!selectedItemId) {
      toast({
        title: "Please select an item",
        description: "You must select an item to claim",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    const formData = new FormData();
    formData.append("itemId", selectedItemId);
    formData.append("evidenceText", data.evidenceText);
    
    if (selectedFile) {
      formData.append("evidenceImage", selectedFile);
    }

    createClaimMutation.mutate(formData);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const activeItems = items.filter(item => item.status === "active");

  const getStatusIcon = (decision: string) => {
    switch (decision) {
      case "approved":
        return <CheckCircle className="h-6 w-6 text-green-400" />;
      case "rejected":
        return <XCircle className="h-6 w-6 text-red-400" />;
      case "manual_review":
        return <Clock className="h-6 w-6 text-yellow-400" />;
      default:
        return <Search className="h-6 w-6 text-blue-400" />;
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
        return "Manual Review Required";
      default:
        return decision.charAt(0).toUpperCase() + decision.slice(1);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="item-select">Select Item to Claim</Label>
          <Select value={selectedItemId} onValueChange={setSelectedItemId}>
            <SelectTrigger data-testid="select-claim-item">
              <SelectValue placeholder="Choose an item you found" />
            </SelectTrigger>
            <SelectContent>
              {activeItems.length === 0 ? (
                <SelectItem value="no-items" disabled>No items available to claim</SelectItem>
              ) : (
                activeItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.itemName} - {item.location}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="evidence-text">Describe Your Item</Label>
          <Textarea
            id="evidence-text"
            placeholder="Provide detailed description of the item you're claiming, including unique features, scratches, or identifying marks..."
            rows={4}
            {...form.register("evidenceText")}
            data-testid="textarea-evidence-text"
          />
          {form.formState.errors.evidenceText && (
            <p className="text-sm text-red-500" data-testid="error-evidence-text">
              {form.formState.errors.evidenceText.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Upload Proof of Ownership</Label>
          <div className="border-2 border-dashed border-border/30 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors glass-light">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="evidence-file-upload"
              data-testid="input-evidence-file"
            />
            <label htmlFor="evidence-file-upload" className="cursor-pointer">
              <Shield className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <p className="text-muted-foreground mb-2">
                {selectedFile ? selectedFile.name : "Upload photos showing ownership or the item"}
              </p>
              <p className="text-sm text-muted-foreground">
                Accepted: JPG, PNG, HEIC (Max 5MB)
              </p>
            </label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full glass-shiny-button py-3 text-lg"
          disabled={createClaimMutation.isPending || isVerifying || !selectedItemId}
          data-testid="button-submit-claim"
        >
          {createClaimMutation.isPending || isVerifying ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {isVerifying ? "AI Verification in Progress..." : "Submit Claim for AI Verification"}
        </Button>
      </form>

      {/* AI Verification Progress */}
      {isVerifying && (
        <Card className="glass-card">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <Search className="h-12 w-12 text-blue-400 mx-auto mb-2 animate-pulse" />
              <h4 className="text-lg font-semibold">AI Verification in Progress</h4>
              <p className="text-muted-foreground">Analyzing your claim evidence...</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Text Analysis</span>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">Processing...</span>
                  </div>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Image Comparison</span>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">Processing...</span>
                  </div>
                </div>
                <Progress value={60} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Final Verification</span>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">Pending...</span>
                  </div>
                </div>
                <Progress value={25} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <Card className={`border ${getStatusColor(verificationResult.decision)}`}>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              {getStatusIcon(verificationResult.decision)}
              <h4 className="text-lg font-semibold ml-2">
                {formatDecision(verificationResult.decision)}
              </h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted-foreground">Text Match</p>
                <p className="font-medium">
                  {Math.round(verificationResult.textSimilarity * 100)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Image Match</p>
                <p className="font-medium">
                  {Math.round(verificationResult.imageSimilarity * 100)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Final Score</p>
                <p className="font-medium">
                  {Math.round(verificationResult.finalScore * 100)}%
                </p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {verificationResult.reason}
            </p>

            {verificationResult.decision === "rejected" && (
              <Button
                onClick={() => {
                  setVerificationResult(null);
                  setIsVerifying(false);
                }}
                className="glass-shiny-button"
              >
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
