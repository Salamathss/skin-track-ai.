import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  Shield,
  Camera,
  ArrowRight,
  CheckCircle2,
  Scan,
  Sparkles,
  Package,
  Eye,
  Cpu,
  Lock,
  FlaskConical,
} from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Camera,
    title: "Scan",
    description: "Take a photo of your skin. Our clinical-grade AI instantly maps zones, pores, and texture.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "Analyze",
    description: "Get a detailed breakdown of hydration, oiliness, sensitivity, and specific skin concerns.",
  },
  {
    step: "03",
    icon: Package,
    title: "Track",
    description: "Add your products to the Cosmetic Shelf. See what actually works for your unique skin over time.",
  },
];

const pillars = [
  {
    icon: Eye,
    title: "Precision AI Analysis",
    description: "Computer vision detects hydration levels, pore density, texture irregularities, and inflammation markers across T-zone and U-zone regions.",
    color: "bg-primary-light text-primary",
  },
  {
    icon: FlaskConical,
    title: "Ingredient Transparency",
    description: "Scan any product label to see the full ingredient breakdown. Know exactly what you're putting on your skin and spot potential conflicts.",
    color: "bg-accent-light text-accent",
  },
  {
    icon: Scan,
    title: "Personalized Routine",
    description: "Recommendations built from your actual scan data and your real products — not generic advice from the internet.",
    color: "bg-primary-light text-primary",
  },
];

export default function Index() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Landing nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/pwa-192.png" alt="SkinTrack AI" className="w-8 h-8 rounded-xl shadow-soft" />
            <span className="font-bold text-lg text-gradient-primary">SkinTrack AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="nav-link text-sm">How it Works</a>
            <a href="#features" className="nav-link text-sm">Features</a>
            <a href="#privacy" className="nav-link text-sm">Privacy</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link to="/signup" className="px-4 py-2 gradient-primary text-primary-foreground text-sm font-semibold rounded-xl shadow-soft hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20 px-6 overflow-hidden relative">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-accent/8 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-card border border-primary/20 rounded-full px-4 py-2 mb-8 shadow-soft animate-fade-in">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse-soft" />
              <span className="text-sm font-medium text-muted-foreground">
                Currently in Beta · Join the early community
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
              Your Skin,{" "}
              <span className="text-gradient-primary">Decoded</span>
              <br />
              by AI.
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up delay-100">
              Professional skin analysis and smart cosmetic tracking in your pocket.
              No guesswork, just science.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-200">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 gradient-primary text-primary-foreground font-semibold rounded-2xl shadow-elevated hover:opacity-90 transition-all duration-200 hover:-translate-y-0.5"
              >
                <Camera className="w-4 h-4" />
                Scan Now — It's Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 mt-5 animate-fade-in delay-300">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Photos encrypted & processed privately. Never shared.
              </p>
            </div>
          </div>

          {/* App Preview Card */}
          <div className="mt-16 animate-slide-up delay-300">
            <div className="glass-card max-w-sm mx-auto p-6 shadow-elevated">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Latest Scan</p>
                  <p className="font-semibold text-foreground">Today</p>
                </div>
                <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>

              <div className="flex items-center justify-center py-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="314"
                      strokeDashoffset="220"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">32</span>
                    <span className="text-xs text-muted-foreground font-medium">/ 100</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Hydration", value: "72%" },
                  { label: "Oiliness", value: "28%" },
                  { label: "Sensitivity", value: "Low" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-semibold text-foreground text-xs">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-6 bg-card border-y border-border/50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How it{" "}
              <span className="text-gradient-primary">works</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Three simple steps to understand your skin better than ever.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(({ step, icon: Icon, title, description }, i) => (
              <div
                key={title}
                className="relative text-center group"
              >
                <div className="text-6xl font-bold text-primary/10 mb-4 leading-none">{step}</div>
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-soft group-hover:scale-110 transition-transform duration-200">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xl mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 -right-4 w-8 text-primary/20">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Value Propositions */}
      <section id="features" className="py-24 px-6 bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for{" "}
              <span className="text-gradient-primary">real results</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Not generic tips. Actual data-driven skincare intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map(({ icon: Icon, title, description, color }, i) => (
              <div
                key={title}
                className="glass-card p-8 hover-lift"
              >
                <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-5`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-3">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="py-20 px-6 gradient-hero border-y border-border/50">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="w-16 h-16 bg-primary-light rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-3">Safe & Private. Always.</h2>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Your skin data is processed securely and privately. Photos are encrypted, never stored on third-party servers, and never sold. You own your data — delete it anytime.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {[
              "End-to-end encrypted",
              "Never sold or shared",
              "Delete anytime",
              "GDPR compliant",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground bg-card rounded-full px-4 py-2 border border-border/50">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Powered By + Beta Banner */}
      <section className="py-16 px-6 bg-card border-b border-border/50">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Powered by</p>
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {[
              { icon: Cpu, label: "Advanced Computer Vision" },
              { icon: Sparkles, label: "Next-gen AI Models" },
              { icon: Lock, label: "Zero-knowledge Privacy" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="bg-primary-light/50 border border-primary/20 rounded-2xl px-6 py-4 inline-block">
            <p className="text-sm text-foreground/80">
              🧪 <span className="font-semibold">Currently in Beta.</span>{" "}
              Join us in shaping the future of skincare. Your feedback matters.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Start understanding your skin{" "}
            <span className="text-gradient-primary">today</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Free to use. No credit card. Just honest, data-driven skincare.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 gradient-primary text-primary-foreground font-semibold rounded-2xl shadow-elevated hover:opacity-90 transition-all duration-200 hover:-translate-y-1 text-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border/50 bg-card">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/pwa-192.png" alt="SkinTrack AI" className="w-6 h-6 rounded-lg" />
            <span className="font-bold text-sm text-gradient-primary">SkinTrack AI</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 SkinTrack AI · Privacy-first skin intelligence
          </p>
        </div>
      </footer>
    </div>
  );
}
