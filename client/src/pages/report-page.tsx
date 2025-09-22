import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertItemSchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

const itemFormSchema = insertItemSchema.extend({
  date: z.string().min(1, "Date is required"),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

export default function ReportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const lostForm = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      type: "lost",
      itemName: "",
      description: "",
      location: "",
      date: "",
      contactInfo: "",
    },
  });

  const foundForm = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      type: "found",
      itemName: "",
      description: "",
      location: "",
      date: "",
      contactInfo: "",
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: { formData: FormData; type: "lost" | "found" }) => {
      const res = await fetch("/api/items", {
        method: "POST",
        body: data.formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success!",
        description: `${variables.type === "lost" ? "Lost" : "Found"} item reported successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      
      // Reset form
      if (variables.type === "lost") {
        lostForm.reset();
      } else {
        foundForm.reset();
      }
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ItemFormData, type: "lost" | "found") => {
    const formData = new FormData();
    
    // Add form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });
    
    // Add file if selected
    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    createItemMutation.mutate({ formData, type });
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

  const FileUploadArea = ({ required = false }: { required?: boolean }) => (
    <div className="space-y-2">
      <Label>Upload Photo {required && "(Required)"}</Label>
      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          data-testid="input-file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground mb-2">
            {selectedFile ? selectedFile.name : "Drag & drop or click to upload"}
          </p>
          <p className="text-sm text-muted-foreground">
            {required ? "Photo required for verification" : "Optional - helps with verification"}
          </p>
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative">
      {/* Spline Background */}
      <div className="absolute inset-0 z-0">
        <iframe 
          src='https://my.spline.design/claritystream-H2XMbAwzgCJFmP5MugBJIizs/' 
          frameBorder='0' 
          width='100%' 
          height='100%'
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-transparent to-black/60"></div>
      </div>

      <div className="relative z-10">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Report an Item</h1>
            <p className="text-xl text-muted-foreground">Help reunite items with their owners</p>
          </div>

          <Tabs defaultValue="lost" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-8 glass">
              <TabsTrigger value="lost" className="flex items-center gap-2 glass-button" data-testid="tab-lost">
                <AlertTriangle className="h-4 w-4" />
                Report Lost Item
              </TabsTrigger>
              <TabsTrigger value="found" className="flex items-center gap-2 glass-button" data-testid="tab-found">
                <CheckCircle className="h-4 w-4" />
                Report Found Item
              </TabsTrigger>
            </TabsList>

          <TabsContent value="lost">
            <Card className="glass-card border-border/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Report Lost Item
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={lostForm.handleSubmit((data) => onSubmit(data, "lost"))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="lost-item-name">Item Name</Label>
                      <Input
                        id="lost-item-name"
                        placeholder="e.g., iPhone 14 Pro"
                        {...lostForm.register("itemName")}
                        data-testid="input-lost-item-name"
                      />
                      {lostForm.formState.errors.itemName && (
                        <p className="text-sm text-red-500" data-testid="error-lost-item-name">
                          {lostForm.formState.errors.itemName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lost-contact">Contact Information</Label>
                      <Input
                        id="lost-contact"
                        type="email"
                        placeholder="your.email@example.com"
                        {...lostForm.register("contactInfo")}
                        data-testid="input-lost-contact"
                      />
                      {lostForm.formState.errors.contactInfo && (
                        <p className="text-sm text-red-500" data-testid="error-lost-contact">
                          {lostForm.formState.errors.contactInfo.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lost-description">Description</Label>
                    <Textarea
                      id="lost-description"
                      placeholder="Detailed description including unique features, color, brand, etc."
                      rows={4}
                      {...lostForm.register("description")}
                      data-testid="textarea-lost-description"
                    />
                    {lostForm.formState.errors.description && (
                      <p className="text-sm text-red-500" data-testid="error-lost-description">
                        {lostForm.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="lost-location">Last Seen Location</Label>
                      <Input
                        id="lost-location"
                        placeholder="e.g., Central Park, NYC"
                        {...lostForm.register("location")}
                        data-testid="input-lost-location"
                      />
                      {lostForm.formState.errors.location && (
                        <p className="text-sm text-red-500" data-testid="error-lost-location">
                          {lostForm.formState.errors.location.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lost-date">Date Lost</Label>
                      <Input
                        id="lost-date"
                        type="date"
                        {...lostForm.register("date")}
                        data-testid="input-lost-date"
                      />
                      {lostForm.formState.errors.date && (
                        <p className="text-sm text-red-500" data-testid="error-lost-date">
                          {lostForm.formState.errors.date.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <FileUploadArea />

                  <Button
                    type="submit"
                    className="w-full glass-shiny-button py-3 text-lg"
                    disabled={createItemMutation.isPending}
                    data-testid="button-submit-lost"
                  >
                    {createItemMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Report Lost Item
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="found">
            <Card className="glass-card border-border/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  Report Found Item
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={foundForm.handleSubmit((data) => onSubmit(data, "found"))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="found-item-name">Item Name</Label>
                      <Input
                        id="found-item-name"
                        placeholder="e.g., Car Keys"
                        {...foundForm.register("itemName")}
                        data-testid="input-found-item-name"
                      />
                      {foundForm.formState.errors.itemName && (
                        <p className="text-sm text-red-500" data-testid="error-found-item-name">
                          {foundForm.formState.errors.itemName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="found-contact">Contact Information</Label>
                      <Input
                        id="found-contact"
                        type="email"
                        placeholder="your.email@example.com"
                        {...foundForm.register("contactInfo")}
                        data-testid="input-found-contact"
                      />
                      {foundForm.formState.errors.contactInfo && (
                        <p className="text-sm text-red-500" data-testid="error-found-contact">
                          {foundForm.formState.errors.contactInfo.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="found-description">Description</Label>
                    <Textarea
                      id="found-description"
                      placeholder="Detailed description of the found item"
                      rows={4}
                      {...foundForm.register("description")}
                      data-testid="textarea-found-description"
                    />
                    {foundForm.formState.errors.description && (
                      <p className="text-sm text-red-500" data-testid="error-found-description">
                        {foundForm.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="found-location">Found Location</Label>
                      <Input
                        id="found-location"
                        placeholder="e.g., Times Square, NYC"
                        {...foundForm.register("location")}
                        data-testid="input-found-location"
                      />
                      {foundForm.formState.errors.location && (
                        <p className="text-sm text-red-500" data-testid="error-found-location">
                          {foundForm.formState.errors.location.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="found-date">Date Found</Label>
                      <Input
                        id="found-date"
                        type="date"
                        {...foundForm.register("date")}
                        data-testid="input-found-date"
                      />
                      {foundForm.formState.errors.date && (
                        <p className="text-sm text-red-500" data-testid="error-found-date">
                          {foundForm.formState.errors.date.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <FileUploadArea required />

                  <Button
                    type="submit"
                    className="w-full glass-shiny-button py-3 text-lg"
                    disabled={createItemMutation.isPending}
                    data-testid="button-submit-found"
                  >
                    {createItemMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Report Found Item
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}
