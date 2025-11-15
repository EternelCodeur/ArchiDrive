import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      // Ici on pourrait brancher un toast si besoin
      return;
    }
    // Simulation de changement de mot de passe côté front uniquement
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex overflow-hidden px-4 md:px-6 py-6">
        {/* Contenu profil */}
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="w-full max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  if (user.role === "admin") {
                    navigate("/admin");
                  } else if (user.role === "super_admin") {
                    navigate("/super-admin");
                  } else {
                    navigate("/agent");
                  }
                }}
              >
                Retour
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">Mon profil</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Consultez vos informations et mettez à jour votre mot de passe.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-lg border bg-card p-4">
              <h2 className="text-sm font-medium text-muted-foreground">Informations personnelles</h2>
              <div className="grid gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nom</p>
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rôle</p>
                  <p className="text-sm font-medium">{user.role}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
              <h2 className="text-sm font-medium text-muted-foreground">Modifier le mot de passe</h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Mot de passe actuel</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nouveau mot de passe</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Confirmer le nouveau mot de passe</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <Button type="submit">Mettre à jour le mot de passe</Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
