import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface StorageOverviewApi {
  id: number;
  total_capacity: number;
  used_storage: number;
}

export const SuperAdminStorageOverview = () => {
  const queryClient = useQueryClient();
  const { user, booting } = useAuth();
  const enabled = !booting && !!user && user.role === "super_admin";
  const [totalCapacityInput, setTotalCapacityInput] = useState("0");

  const { data: overview, isLoading } = useQuery<StorageOverviewApi | null>({
    queryKey: ["super-admin-storage-overview"],
    enabled,
    queryFn: async () => {
      const res = await apiFetch("/api/super-admin-storage-overviews");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement du stockage global");
      }
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { total_capacity: number }) => {
      if (overview && overview.id) {
        const res = await apiFetch(`/api/super-admin-storage-overviews/${overview.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            total_capacity: payload.total_capacity,
            used_storage: overview.used_storage,
          }),
          toast: { success: { enabled: false }, error: { enabled: false } },
        });
        if (!res.ok) {
          throw new Error("Erreur lors de la mise à jour du stockage global");
        }
        return res.json();
      }

      const res = await apiFetch(`/api/super-admin-storage-overviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_capacity: payload.total_capacity,
          used_storage: 0,
        }),
        toast: { success: { enabled: false }, error: { enabled: false } },
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la création du stockage global");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-storage-overview"] });
    },
  });

  const totalCapacity = typeof overview?.total_capacity === "number" ? overview.total_capacity : 0;
  const usedStorage = overview?.used_storage ?? 0;
  const effectiveCapacity = totalCapacity || 1;
  const usedPercent = Math.min(100, Math.max(0, (usedStorage / effectiveCapacity) * 100));

  useEffect(() => {
    if (overview && typeof overview.total_capacity === "number") {
      setTotalCapacityInput(overview.total_capacity.toString());
    }
  }, [overview]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const totalValue = parseFloat(totalCapacityInput.replace(",", "."));
    if (isLoading || mutation.isPending) {
      return;
    }
    if (isNaN(totalValue) || totalValue < 0) {
      toast.error("Veuillez saisir une capacité totale valide (>= 0).");
      return;
    }

    mutation.mutate(
      {
        total_capacity: totalValue,
      },
      {
        onSuccess: () => {
          toast.success("Stockage enregistré", {
            description: "La configuration de stockage global a été mise à jour.",
          });
        },
        onError: () => {
          toast.error("Une erreur est survenue lors de l'enregistrement du stockage.");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gestion du stockage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualisez la consommation globale du stockage alloué aux entreprises.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 items-center">
        <Card>
          <CardHeader>
            <CardTitle>Résumé du stockage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Capacité totale : </span>
              {isLoading ? "Chargement..." : `${effectiveCapacity.toFixed(1)} Go`}
            </p>
            <p>
              <span className="font-medium">Utilisé : </span>
              {isLoading ? "-" : `${usedStorage} Go (${usedPercent.toFixed(0)} %)`}
            </p>
            <p>
              <span className="font-medium">Restant : </span>
              {isLoading ? "-" : `${Math.max(0, effectiveCapacity - usedStorage).toFixed(1)} Go`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Configurez ici la capacité totale de stockage à l'échelle de l'application.
            </p>
            <form onSubmit={handleSave} className="mt-3 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-32">Capacité totale (Go)</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={totalCapacityInput}
                  onChange={(e) => setTotalCapacityInput(e.target.value)}
                  className="h-8 w-32 text-xs"
                  disabled={isLoading || mutation.isPending}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={isLoading || mutation.isPending}
                >
                  {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-3">
          <div className="relative w-40 h-40">
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `conic-gradient(#3b82f6 0 ${usedPercent}%, #e5e7eb ${usedPercent}% 100%)`,
              }}
            />
            <div className="absolute inset-4 rounded-full bg-background flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Utilisé</span>
              <span className="text-lg font-semibold">{usedPercent.toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-blue-500" />
              <span>Stockage utilisé ({usedStorage} Go)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-slate-200" />
              <span>Disponible ({totalCapacity - usedStorage} Go)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
