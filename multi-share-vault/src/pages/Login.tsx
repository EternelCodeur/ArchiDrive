/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { User, Lock, Eye, EyeOff, LogIn, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const slides = useMemo(
    () => [
      {
        title: "Centralisez vos documents",
        description: "Un espace sécurisé pour organiser, retrouver et partager vos fichiers par service.",
      },
      {
        title: "Partage maîtrisé",
        description: "Contrôlez précisément l'accès aux dossiers partagés au sein de l'entreprise.",
      },
      {
        title: "Vue admin claire",
        description: "Gérez vos services, vos employés et vos permissions depuis un tableau de bord.",
      },
    ],
    []
  );

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const goPrev = () => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setActiveSlide((prev) => (prev + 1) % slides.length);

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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="mx-auto w-full max-w-6xl min-h-[calc(100vh-2rem)] grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch rounded-2xl overflow-hidden border bg-white/60 shadow-xl">
        <div className="relative bg-gradient-to-br from-white via-slate-50 to-blue-50 p-8 flex flex-col justify-center">
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border bg-white/80 backdrop-blur flex items-center justify-center text-slate-700 hover:bg-white"
            aria-label="Slide précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border bg-white/80 backdrop-blur flex items-center justify-center text-slate-700 hover:bg-white"
            aria-label="Slide suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="mx-auto w-full max-w-md text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
              <img src="logo-archi.png" alt="ArchiDrive" className="w-7 h-7 object-contain" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-slate-900">{slides[activeSlide].title}</p>
              <p className="text-sm text-slate-600">{slides[activeSlide].description}</p>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`h-2 rounded-full transition-all ${idx === activeSlide ? "w-8 bg-blue-600" : "w-2 bg-slate-300 hover:bg-slate-400"}`}
                aria-label={`Aller à la slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="w-full flex items-center justify-center bg-white/80 p-8">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <div className="mt-4 text-center">
                <h1 className="text-2xl font-semibold text-blue-700">Bienvenue</h1>
              </div>
            </div>

            <Card className="shadow-lg border bg-white/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Connexion</CardTitle>
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

            <div className="mt-6 text-center text-xs text-muted-foreground">
              <p>© {new Date().getFullYear()} ArchiDrive. Tous droits réservés.</p>
              <p className="mt-1">
                Développé par <a className="text-primary hover:underline" href="https://archiged-gabon.com/">ARCHIGED GABON</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
