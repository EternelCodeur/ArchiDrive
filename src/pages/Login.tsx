/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Veuillez renseigner l'identifiant et le mot de passe");
      return;
    }

    setLoading(true);
    const user = await login(identifier, password, remember);
    setLoading(false);

    if (!user) {
      return;
    }

    if (user.role === "agent") {
      navigate("/agent", { replace: true });
    } else if (user.role === "admin") {
      navigate("/admin", { replace: true });
    } else if (user.role === "super_admin") {
      navigate("/super-admin", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-white shadow-sm border flex items-center justify-center overflow-hidden">
            <img src="logo-archi.png" alt="ArchiDrive" className="w-12 h-12 object-contain" />
          </div>
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-semibold">Bienvenue</h1>
            <p className="text-sm text-muted-foreground">Connectez-vous à votre espace</p>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Identifiant</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="email ou identifiant"
                    className="pl-10"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="pl-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" checked={remember} onCheckedChange={(v:any) => setRemember(Boolean(v))} />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground">Se souvenir de moi</Label>
                </div>
                <a href="#" className="text-sm text-primary hover:underline">Mot de passe oublié ?</a>
              </div>

              <Button type="submit" className="w-full" disabled={loading} aria-label="Se connecter">
                {loading ? (
                  <span>Connexion...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Se connecter</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ArchiDrive. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default Login;
