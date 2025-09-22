import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, User } from "lucide-react";
import { type ItemWithUser } from "@shared/schema";
import { useLocation } from "wouter";

interface ItemCardProps {
  item: ItemWithUser;
}

export function ItemCard({ item }: ItemCardProps) {
  const [, setLocation] = useLocation();

  const handleClaim = () => {
    setLocation(`/claims?itemId=${item.id}`);
  };

  const getStatusColor = (type: string) => {
    return type === "lost" 
      ? "bg-red-500/20 text-red-400 border-red-500/20"
      : "bg-green-500/20 text-green-400 border-green-500/20";
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card 
      className={`bg-card rounded-xl border transition-colors hover:border-opacity-50 ${
        item.type === "lost" ? "hover:border-red-500/50" : "hover:border-green-500/50"
      }`}
      data-testid={`item-card-${item.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Badge className={getStatusColor(item.type)} data-testid={`item-type-${item.id}`}>
            {item.type === "lost" ? "Lost" : "Found"}
          </Badge>
          <span className="text-muted-foreground text-sm" data-testid={`item-date-${item.id}`}>
            {formatDate(item.createdAt!)}
          </span>
        </div>

        {/* Image */}
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.itemName}
            className="w-full h-48 object-cover rounded-lg mb-4"
            data-testid={`item-image-${item.id}`}
          />
        )}

        {/* Content */}
        <h3 className="text-xl font-semibold mb-2" data-testid={`item-name-${item.id}`}>
          {item.itemName}
        </h3>
        
        <p className="text-muted-foreground mb-4 line-clamp-3" data-testid={`item-description-${item.id}`}>
          {item.description}
        </p>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            <span data-testid={`item-location-${item.id}`}>{item.location}</span>
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            <span data-testid={`item-event-date-${item.id}`}>
              {item.type === "lost" ? "Lost on" : "Found on"} {formatDate(item.date)}
            </span>
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <User className="h-4 w-4 mr-2" />
            <span data-testid={`item-user-${item.id}`}>
              {item.type === "lost" ? "Lost by" : "Found by"} {item.user.username}
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs" data-testid={`item-status-${item.id}`}>
            {item.status === "active" ? "Available" : 
             item.status === "claimed" ? "Claimed" : "Resolved"}
          </Badge>

          <Button
            size="sm"
            className="shiny-button"
            onClick={handleClaim}
            disabled={item.status !== "active"}
            data-testid={`item-claim-button-${item.id}`}
          >
            {item.type === "lost" ? "I Found This" : "This is Mine"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
