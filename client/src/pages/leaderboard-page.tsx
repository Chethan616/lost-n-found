import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardUser {
  id: string;
  username: string;
  points: number;
  createdAt: string | null;
}

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useQuery<LeaderboardUser[]>({
    queryKey: ['/api/leaderboard'],
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <Trophy className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-slate-400/20 border-gray-400/50";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/50";
      default:
        return "bg-card/50";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
            Leaderboard
          </h1>
        </div>
        <p className="text-muted-foreground">
          Top contributors in our Lost & Found community
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Contributors</CardTitle>
          <CardDescription>
            Earn points by reporting items and assisting others in recovering their belongings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((user, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-md ${getRankColor(rank)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(rank)}
                      </div>
                      <Avatar className="h-12 w-12 border-2">
                        <AvatarFallback className="text-lg font-semibold bg-primary/10">
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg truncate">
                          {user.username}
                        </h3>
                        {rank <= 3 && (
                          <Badge variant="secondary" className="text-xs">
                            Top {rank}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Rank #{rank}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-2xl font-bold text-primary">
                          {user.points}
                        </span>
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      </div>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Rankings Available</h3>
              <p className="text-muted-foreground">
                Start earning points by reporting lost or found items
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Earn Points</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-2xl">📦</div>
              <div>
                <h4 className="font-semibold">Report Found Item</h4>
                <p className="text-sm text-muted-foreground">+50 points</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-2xl">🔍</div>
              <div>
                <h4 className="font-semibold">Report Lost Item</h4>
                <p className="text-sm text-muted-foreground">+20 points</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-2xl">✅</div>
              <div>
                <h4 className="font-semibold">Successful Claim</h4>
                <p className="text-sm text-muted-foreground">+100 points</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-2xl">🤝</div>
              <div>
                <h4 className="font-semibold">Assist Recovery</h4>
                <p className="text-sm text-muted-foreground">+75 points</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
