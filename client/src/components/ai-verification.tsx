import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Shield, Brain } from "lucide-react";

export function AIVerification() {
  return (
    <div className="space-y-6">
      {/* AI Verification Info */}
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <Brain className="h-12 w-12 text-blue-400 mx-auto mb-2" />
            <h4 className="text-lg font-semibold">AI-Powered Verification</h4>
            <p className="text-muted-foreground">Advanced machine learning ensures secure claim processing</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <h5 className="font-medium mb-1">Text Analysis</h5>
              <p className="text-sm text-muted-foreground">Compares descriptions with 80%+ accuracy threshold</p>
            </div>
            
            <div className="text-center">
              <Shield className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <h5 className="font-medium mb-1">Image Verification</h5>
              <p className="text-sm text-muted-foreground">AI vision compares uploaded photos with original items</p>
            </div>
            
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <h5 className="font-medium mb-1">Auto-Approval</h5>
              <p className="text-sm text-muted-foreground">Claims with high confidence are approved instantly</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <h4 className="text-lg font-semibold mb-4">How AI Verification Works</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-400">1</span>
              </div>
              <p className="text-muted-foreground">You submit your claim with detailed description and optional photos</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-400">2</span>
              </div>
              <p className="text-muted-foreground">AI analyzes text similarity between your description and the original item</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-400">3</span>
              </div>
              <p className="text-muted-foreground">If text similarity is 80% or higher, claim is automatically approved</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-yellow-400">4</span>
              </div>
              <p className="text-muted-foreground">Lower similarity scores go to manual review by our team</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
