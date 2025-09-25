import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Package, FileText, CheckCircle, TrendingUp, Clock, XCircle } from "lucide-react";
import { type ItemWithUser, type ClaimWithItem } from "@shared/schema";

interface DashboardStats {
  itemsReported: number;
  claimsSubmitted: number;
  itemsReunited: number;
  successRate: number;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: userItems = [], isLoading: itemsLoading } = useQuery<ItemWithUser[]>({
    queryKey: ["/api/users", user?.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery<ClaimWithItem[]>({
    queryKey: ["/api/users", user?.id, "claims"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/claims`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch claims");
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Completely remove claimed items from dashboard lists (not just hide in UI)
  const visibleUserItems = userItems.filter(item => item.status !== 'claimed');

  const recentActivity = [
    ...visibleUserItems.slice(0, 3).map(item => ({
      id: `item-${item.id}`,
      type: 'item',
      title: `${item.type === 'lost' ? 'Lost' : 'Found'} item: ${item.itemName}`,
      description: `${item.type === 'lost' ? 'Reported lost' : 'Reported found'} in ${item.location}`,
      time: new Date(item.createdAt!).toLocaleDateString(),
      icon: item.type === 'lost' ? XCircle : CheckCircle,
      color: item.type === 'lost' ? 'text-red-400' : 'text-green-400'
    })),
    ...claims.slice(0, 3).map(claim => ({
      id: `claim-${claim.id}`,
      type: 'claim',
      title: `Claim ${claim.status} for ${claim.item.itemName}`,
      description: claim.reason || 'Claim processed',
      time: new Date(claim.createdAt!).toLocaleDateString(),
      icon: claim.status === 'approved' ? CheckCircle : claim.status === 'rejected' ? XCircle : Clock,
      color: claim.status === 'approved' ? 'text-green-400' : claim.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  const statCards = [
    {
      title: "Items Reported",
      value: stats?.itemsReported || 0,
      icon: Package,
      color: "text-blue-400",
      testId: "stat-items-reported"
    },
    {
      title: "Claims Submitted",
      value: stats?.claimsSubmitted || 0,
      icon: FileText,
      color: "text-purple-400",
      testId: "stat-claims-submitted"
    },
    {
      title: "Items Reunited",
      value: stats?.itemsReunited || 0,
      icon: CheckCircle,
      color: "text-green-400",
      testId: "stat-items-reunited"
    },
    {
      title: "Success Rate",
      value: `${stats?.successRate || 0}%`,
      icon: TrendingUp,
      color: "text-orange-400",
      testId: "stat-success-rate"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Spline Background */}
      <div className="absolute inset-0 z-0">
        <iframe 
          src='https://my.spline.design/claritystream-lkgbVYMu6eVcDGgnhEeByPtS/' 
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Your Dashboard</h1>
          <p className="text-xl text-muted-foreground">Track your reports and claims</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold" data-testid={stat.testId}>
                      {statsLoading ? "..." : stat.value}
                    </p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {itemsLoading || claimsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-secondary rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div 
                        key={activity.id}
                        className="flex items-center space-x-4 p-4 bg-secondary rounded-xl"
                        data-testid={`activity-${activity.id}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.color === 'text-green-400' ? 'bg-green-500/20' :
                          activity.color === 'text-red-400' ? 'bg-red-500/20' :
                          activity.color === 'text-yellow-400' ? 'bg-yellow-500/20' :
                          'bg-blue-500/20'
                        }`}>
                          <activity.icon className={`h-5 w-5 ${activity.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`activity-title-${activity.id}`}>
                            {activity.title}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`activity-description-${activity.id}`}>
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground" data-testid={`activity-time-${activity.id}`}>
                          {activity.time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <button 
                  className="w-full shiny-button py-3 rounded-xl font-medium"
                  onClick={() => window.location.href = '/report'}
                  data-testid="button-quick-report"
                >
                  Report New Item
                </button>
                <button 
                  className="w-full shiny-button py-3 rounded-xl font-medium"
                  onClick={() => window.location.href = '/browse'}
                  data-testid="button-quick-browse"
                >
                  Browse Items
                </button>
                <button 
                  className="w-full shiny-button py-3 rounded-xl font-medium"
                  onClick={() => window.location.href = '/claims'}
                  data-testid="button-quick-claim"
                >
                  Submit Claim
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
