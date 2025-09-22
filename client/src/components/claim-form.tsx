import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertClaimSchema } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, Shield, Loader2 } from "lucide-react";
import { type ItemWithUser } from "@shared/schema";

const claimFormSchema = insertClaimSchema;

type ClaimFormData = z.infer<typeof claimFormSchema>;

export function ClaimForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
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
      toast({
        title: "Claim Submitted!",
        description: `Your claim has been submitted for AI verification. Status: ${data.status}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      form.reset();
      setSelectedFile(null);
      setSelectedItemId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  return (
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
        disabled={createClaimMutation.isPending || !selectedItemId}
        data-testid="button-submit-claim"
      >
        {createClaimMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Submit Claim for AI Verification
      </Button>
    </form>
  );
}
