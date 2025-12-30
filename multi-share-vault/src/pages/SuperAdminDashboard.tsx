import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { SuperAdminSidebar, SuperAdminTab } from "@/components/super-admin/SuperAdminSidebar";
import { SuperAdminEnterprisesManagement } from "@/components/super-admin/SuperAdminEnterprisesManagement";
import { SuperAdminStorageOverview } from "@/components/super-admin/SuperAdminStorageOverview";
import { SuperAdminSuperAdminsManagement } from "@/components/super-admin/SuperAdminSuperAdminsManagement";
import { useAuth } from "@/contexts/AuthContext";

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>("dashboard");
  const { user, booting } = useAuth();
  const enabled = !booting && !!user && user.role === "super_admin";
  type Enterprise = { id: number; name: string; admin_name: string; email: string; storage: number };
  const { data: enterprises = [], isLoading: enterprisesLoading } = useQuery<Enterprise[]>({
    queryKey: ["enterprises"],
    enabled,
    queryFn: async () => {
      const res = await apiFetch("/api/enterprises");
      if (!res.ok) throw new Error("Erreur lors du chargement des entreprises");
      return res.json();
    },
  });
  const { data: overview } = useQuery<{ id: number; total_capacity: number; used_storage: number } | null>({
    queryKey: ["super-admin-storage-overview"],
    enabled,
    queryFn: async () => {
      const res = await apiFetch("/api/super-admin-storage-overviews");
      if (!res.ok) return null;
      return res.json();
    },
  });
  const { data: superAdmins = [] } = useQuery<Array<{ id: number }>>({
    queryKey: ["super-admins"],
    enabled,
    queryFn: async () => {
      const res = await apiFetch("/api/super-admins");
      if (!res.ok) throw new Error("Erreur lors du chargement des super administrateurs");
      return res.json();
    },
  });

  type Stats = {
    enterprises: number;
    users: { total: number; admin: number; agent: number; super_admin: number };
    storage: { total_capacity: number; used_storage: number };
    users_by_enterprise: Record<number, number>;
  };
  const { data: stats } = useQuery<Stats>({
    queryKey: ["stats"],
    enabled,
    queryFn: async () => {
      const res = await apiFetch("/api/stats");
      if (!res.ok) throw new Error("Erreur lors du chargement des statistiques");
      return res.json();
    },
  });

  const totalEnterprises = enterprises.length;
  const totalCapacity = typeof overview?.total_capacity === "number" ? overview.total_capacity : 0;
  const usedStorage = typeof overview?.used_storage === "number" ? overview.used_storage : 0;

  const renderEnterprisesGrid = () => (
    <Card>
      <CardHeader>
        <CardTitle>Entreprises</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {enterprisesLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {!enterprisesLoading && enterprises.map((e) => (
            <Card key={e.id} className="border rounded-md p-3 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Admin : {e.admin_name}</div>
                  <div className="text-xs text-muted-foreground">Email admin : {e.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs">
                <Card className="border-dashed">
                  <CardContent className="py-3 px-3 flex flex-col gap-1">
                    <span className="text-muted-foreground">Stockage alloué</span>
                    <span className="text-base font-semibold">{e.storage ?? 0} Go</span>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="py-3 px-3 flex flex-col gap-1">
                    <span className="text-muted-foreground">Utilisateurs</span>
                    <span className="text-base font-semibold">{stats?.users_by_enterprise?.[e.id] ?? 0}</span>
                  </CardContent>
                </Card>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    if (activeTab === "dashboard") {
      return (
        <div className="space-y-6">
          {/* Header d'espace super admin */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Gestion Super Admin</h1>
              <p className="text-sm text-muted-foreground mt-1">Vue globale des données en base.</p>
            </div>
            <div />
          </div>

          {/* Statistiques globales */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Entreprises: bleu → blanc */}
            <Card className="bg-gradient-to-r from-blue-700 via-sky-400 to-white text-slate-900 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Entreprises</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{totalEnterprises}</p>
                <p className="text-xs text-muted-foreground mt-1">Tenants actifs</p>
              </CardContent>
            </Card>

            {/* Stockage total: blanc → orange */}
            <Card className="bg-gradient-to-r from-white via-orange-300 to-orange-500 text-slate-900 border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stockage total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{totalCapacity} Go</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Stockage alloué à l'ensemble des entreprises
                </p>
              </CardContent>
            </Card>

            {/* Stockage utilisé: bleu nuit → bleu → orange */}
            <Card className="bg-gradient-to-r from-blue-900 via-blue-600 to-orange-500 text-white border-none shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stockage utilisé</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{usedStorage} Go</p>
                <p className="text-xs text-muted-foreground mt-1">sur {totalCapacity} Go</p>
              </CardContent>
            </Card>
          </div>

          {renderEnterprisesGrid()}
        </div>
      );
    }
    if (activeTab === "enterprises") {
      // Onglet gestion des entreprises : on affiche l'interface complète de gestion
      return (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gestion des entreprises</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Créez, modifiez et supprimez les entreprises clientes du tenant.
            </p>
          </div>
          <SuperAdminEnterprisesManagement />
        </div>
      );
    }
    if (activeTab === "super_admins") {
      return (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gestion des super administrateurs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Créez, modifiez et supprimez les comptes super admin du tenant.
            </p>
          </div>
          <SuperAdminSuperAdminsManagement />
        </div>
      );
    }

    // Onglet gestion du stockage : on délègue au composant dédié
    return <SuperAdminStorageOverview />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex">
        {/* Sidebar Super Admin */}
        <SuperAdminSidebar activeTab={activeTab} onChangeTab={setActiveTab} />

        {/* Contenu principal */}
        <section className="flex-1 p-6 space-y-6 overflow-y-auto">
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
