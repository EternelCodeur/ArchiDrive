import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockEnterprises, mockUsers, mockServices, mockDocuments } from "@/data/mockData";
import { Database } from "lucide-react";
import { SuperAdminSidebar, SuperAdminTab } from "@/components/super-admin/SuperAdminSidebar";
import { SuperAdminEnterprisesManagement } from "@/components/super-admin/SuperAdminEnterprisesManagement";
import { SuperAdminStorageOverview } from "@/components/super-admin/SuperAdminStorageOverview";
import { SuperAdminSuperAdminsManagement } from "@/components/super-admin/SuperAdminSuperAdminsManagement";

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>("dashboard");
  const admins = mockUsers.filter((u) => u.role === "admin");
  const totalEnterprises = mockEnterprises.length;
  const totalCapacity = 1000; // Capacité totale simulée (Go)
  const usedStorage = 500; // Go simulés déjà consommés

  // Stockage simulé par entreprise (en Go)
  const [enterpriseStorage, setEnterpriseStorage] = useState<Record<number, number>>(
    () => {
      const initial: Record<number, number> = {};
      mockEnterprises.forEach((e) => {
        initial[e.id] = 1000; // 100 Go par entreprise par défaut
      });
      return initial;
    }
  );

  const addStorage = (enterpriseId: number, amount: number) => {
    setEnterpriseStorage((prev) => ({
      ...prev,
      [enterpriseId]: (prev[enterpriseId] ?? 0) + amount,
    }));
  };

  const renderEnterprisesGrid = () => (
    <Card>
      <CardHeader>
        <CardTitle>Entreprises</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {mockEnterprises.map((e) => {
            const servicesForEnterprise = mockServices.filter((s) => s.enterprise_id === e.id);
            const serviceIds = servicesForEnterprise.map((s) => s.id);
            const usersForEnterprise = mockUsers.filter((u) => u.enterprise_id === e.id);
            const documentsForEnterprise = mockDocuments.filter((d) => {
              // Simulation : tous les documents appartiennent à l'entreprise
              return true;
            });

            const currentStorage = enterpriseStorage[e.id] ?? 0;

            return (
              <Card key={e.id} className="border rounded-md p-3 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Admins : {admins.map((a) => a.name).join(", ") || "Aucun admin configuré"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs">
                  <Card className="border-dashed">
                    <CardContent className="py-3 px-3 flex flex-col gap-2">
                      <span className="text-muted-foreground">Stockage alloué</span>
                      <span className="text-base font-semibold">{currentStorage} Go</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Ajouter du stockage :</span>
                        <input
                          type="number"
                          min={0}
                          defaultValue={currentStorage}
                          className="w-20 h-8 rounded-md border border-border bg-background px-2 text-xs"
                          onBlur={(event) => {
                            const value = Number((event.target as HTMLInputElement).value) || 0;
                            if (value > 0) {
                              addStorage(e.id, value);
                            }
                          }}
                        />
                        <span className="text-muted-foreground">Go</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="py-3 px-3 flex flex-col gap-1">
                      <span className="text-muted-foreground">Utilisateurs</span>
                      <span className="text-base font-semibold">{usersForEnterprise.length}</span>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="py-3 px-3 flex flex-col gap-1">
                      <span className="text-muted-foreground">Documents</span>
                      <span className="text-base font-semibold">{documentsForEnterprise.length}</span>
                    </CardContent>
                  </Card>
                </div>
              </Card>
            );
          })}
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
              <p className="text-sm text-muted-foreground mt-1">
                Vue globale du tenant : entreprises clientes, stockage alloué et usage simulé.
              </p>
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
                <p className="text-xs text-muted-foreground mt-1">
                  sur {totalCapacity} Go (simulation)
                </p>
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
    return <SuperAdminStorageOverview totalCapacity={totalCapacity} usedStorage={usedStorage} />;
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
