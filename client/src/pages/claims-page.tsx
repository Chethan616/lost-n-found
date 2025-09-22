import { Navbar } from "@/components/navbar";
import { ClaimForm } from "@/components/claim-form";
import { AIVerification } from "@/components/ai-verification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle, Clock, XCircle, Search } from "lucide-react";
import { type ClaimWithItem } from "@shared/schema";

export default function ClaimsPage() {
  const { user } = useAuth();

  const { data: claims = [], isLoading } = useQuery<ClaimWithItem[]>({
    queryKey: ["/api/users", user?.id, "claims"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/claims`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch claims");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const getStatusIcon = (status: string | null) => {
    const statusValue = status || "pending";
    switch (statusValue) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "manual_review":
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return <Clock className="h-4 w-4 text-blue-400" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    const statusValue = status || "pending";
    switch (statusValue) {
      case "approved":
        return "bg-green-500/20 text-green-400";
      case "rejected":
        return "bg-red-500/20 text-red-400";
      case "manual_review":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-blue-500/20 text-blue-400";
    }
  };

  const formatStatus = (status: string | null) => {
    const statusValue = status || "pending";
    switch (statusValue) {
      case "manual_review":
        return "Manual Review";
      default:
        return statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Spline Background */}
      <div className="absolute inset-0 z-0">
        <iframe 
          src='https://my.spline.design/claritystream-H2XMbAwzgCJFmP5MugBJIizs/' 
          frameBorder='0' 
          width='100%' 
          height='100%'
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">AI-Powered Claim Verification</h1>
          <p className="text-xl text-muted-foreground">Secure and intelligent item verification system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Claim Submission */}
          <div>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-400" />
                  Submit New Claim
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClaimForm />
              </CardContent>
            </Card>

            {/* AI Verification Demo */}
            <Card>
              <CardHeader>
                <CardTitle>AI Verification Process</CardTitle>
              </CardHeader>
              <CardContent>
                <AIVerification />
              </CardContent>
            </Card>
          </div>

          {/* Claims History */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Your Claims History</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-secondary rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : claims.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No claims submitted yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {claims.map((claim) => (
                      <div
                        key={claim.id}
                        className="bg-secondary rounded-xl p-4 border border-border"
                        data-testid={`claim-${claim.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold" data-testid={`claim-item-name-${claim.id}`}>
                            {claim.item.itemName}
                          </h4>
                          <Badge 
                            className={getStatusColor(claim.status)}
                            data-testid={`claim-status-${claim.id}`}
                          >
                            {getStatusIcon(claim.status)}
                            <span className="ml-1">{formatStatus(claim.status)}</span>
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3" data-testid={`claim-evidence-${claim.id}`}>
                          {claim.evidenceText}
                        </p>
                        
                        {claim.aiScore !== null && claim.aiScore !== undefined && (
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <p className="text-muted-foreground">Text Match</p>
                              <p className="font-medium" data-testid={`claim-text-similarity-${claim.id}`}>
                                {Math.round((claim.textSimilarity || 0) * 100)}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground">Image Match</p>
                              <p className="font-medium" data-testid={`claim-image-similarity-${claim.id}`}>
                                {Math.round((claim.imageSimilarity || 0) * 100)}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground">AI Score</p>
                              <p className="font-medium" data-testid={`claim-ai-score-${claim.id}`}>
                                {Math.round(claim.aiScore * 100)}%
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {claim.reason && (
                          <p className="text-xs text-muted-foreground mt-2" data-testid={`claim-reason-${claim.id}`}>
                            {claim.reason}
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2" data-testid={`claim-date-${claim.id}`}>
                          Submitted {new Date(claim.createdAt!).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
