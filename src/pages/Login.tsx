import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast({ title: "Account created", description: "Check your email to verify your account, then log in." });
        setIsSignUp(false);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Auth error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background grid-bg p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="cursor-pointer mb-4" onClick={() => navigate("/")}>
            <h1 className="font-logo text-2xl font-bold tracking-[0.2em]">JUDGEGPT</h1>
          </div>
          <CardTitle className="font-logo tracking-wider text-lg">
            {isSignUp ? "CREATE ACCOUNT" : "JUDGE LOGIN"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Create a judge account" : "Sign in to access the judge dashboard"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" placeholder="judge@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full font-logo tracking-wider" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? "SIGN UP" : "SIGN IN"}
            </Button>
            <div className="text-center">
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
