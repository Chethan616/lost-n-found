import { Navbar } from "@/components/navbar";
import { SplineScene } from "@/components/spline-scene";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Search, Shield, Zap, Users } from "lucide-react";

export default function HomePage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: <Search className="h-8 w-8" />,
      title: "Smart Search",
      description: "Advanced search filters to find your lost items quickly"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "AI Verification",
      description: "Secure claim verification using advanced AI technology"
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Fast Matching",
      description: "Instant notifications when potential matches are found"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Community",
      description: "Connect with helpful community members"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;700&display=swap');
          
          .glassmorphism-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 1em;
          }
          
          .glassmorphism-title {
            font-family: 'Work Sans', cursive;
            font-size: clamp(2rem, 4vw, 3.5rem);
            font-weight: 700;
            line-height: 1.1;
            margin: 0;
            background: linear-gradient(135deg, hsl(0, 0%, 100%), hsl(0, 0%, 90%));
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .glassmorphism-subtitle {
            font-family: 'Work Sans', sans-serif;
            font-size: clamp(0.9rem, 2vw, 1.2rem);
            font-weight: 400;
            line-height: 1.4;
            margin: 0;
            color: hsla(0, 0%, 100%, 0.8);
            max-width: 28em;
          }
          
          .glassmorphism-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75em;
            justify-content: center;
            margin-top: 0.5em;
          }
        `}
      </style>
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-2">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent">
          <SplineScene />
        </div>
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <Card className="glass-card">
            <CardContent className="p-8">
              <div className="glassmorphism-content">
                <h1 className="glassmorphism-title">Lost & Found</h1>
                <p className="glassmorphism-subtitle">
                  AI-powered platform to reunite you with your lost belongings
                </p>
                <div className="glassmorphism-buttons">
                  <Button 
                    size="lg" 
                    className="glass-shiny-button text-lg font-semibold"
                    onClick={() => setLocation("/report")}
                    data-testid="button-report-lost"
                  >
                    Report Lost Item
                  </Button>
                  <Button 
                    size="lg" 
                    className="glass-shiny-button text-lg font-semibold"
                    onClick={() => setLocation("/report")}
                    data-testid="button-report-found"
                  >
                    Report Found Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Why Choose Lost & Found?</h2>
          <p className="text-xl text-muted-foreground">Advanced technology meets human compassion</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="glass-card border-border/20 hover:border-blue-500/50 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="glass-card rounded-2xl p-12 border border-border/20">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who have successfully reunited with their belongings
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="glass-shiny-button"
              onClick={() => setLocation("/browse")}
              data-testid="button-browse-items"
            >
              Browse Lost Items
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="glass-button border-border/20"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-view-dashboard"
            >
              View Dashboard
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
