import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Service } from "@/types";

export const AdminSharedFoldersSection = () => {
  const [name, setName] = useState("");
  const [hostServiceId, setHostServiceId] = useState<number | "">("");
  const [visibility, setVisibility] = useState<"enterprise" | "services">("enterprise");
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  type SharedFolderRow = { id: number; name: string; folder_id: number; visibility: "enterprise" | "services"; services?: number[] };

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/services`, { toast: { error: { enabled: false } } });
      if (!res.ok) throw new Error("Erreur chargement services");
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: sharedFolders = [], refetch: refetchShared } = useQuery<SharedFolderRow[]>({
    queryKey: ["shared-folders-admin"],
    queryFn: async () => {
      const res = await apiFetch(`/api/shared-folders/visible`, { toast: { error: { enabled: false } } });
      if (!res.ok) return [] as SharedFolderRow[];
      return res.json();
    },
    staleTime: 30_000,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<SharedFolderRow | null>(null);
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; name?: string; visibility?: "enterprise" | "services"; services?: number[] }) => {
      const res = await apiFetch(`/api/admin/shared-folders/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name, visibility: payload.visibility, services: payload.services }),
        toast: { success: { message: "Dossier partagé mis à jour" }, error: { enabled: true, message: "Échec de la mise à jour" } },
      });
      if (!res.ok) throw new Error("update_failed");
      return res.json();
    },
    onSuccess: () => {
      setEditOpen(false);
      setEditing(null);
      refetchShared();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/admin/shared-folders/${id}`, {
        method: "DELETE",
        toast: { success: { message: "Partage supprimé" }, error: { enabled: true, message: "Échec de la suppression" } },
      });
      if (!res.ok) throw new Error("delete_failed");
      return true;
    },
    onSuccess: () => {
      refetchShared();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; host_service_id: number; visibility: "enterprise" | "services"; services?: number[] }) => {
      const res = await apiFetch(`/api/admin/shared-folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        toast: { success: { message: "Dossier partagé créé" }, error: { enabled: true, message: "Échec de création" } },
      });
      if (!res.ok) throw new Error("create_failed");
      return res.json();
    },
    onSuccess: () => {
      setName("");
      setHostServiceId("");
      setVisibility("enterprise");
      setSelectedServiceIds([]);
      refetchShared();
    },
  });

  const toggleService = (id: number, checked: boolean) => {
    setSelectedServiceIds((prev) => (checked ? [...prev, id] : prev.filter((sid) => sid !== id)));
  };

  const canSubmit = name.trim().length > 0 && typeof hostServiceId === "number";

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Créer un dossier partagé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-medium">Nom du dossier</p>
              <Input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Service hôte</p>
              <select
                className="border rounded-md px-3 py-2 text-xs w-full"
                value={hostServiceId}
                onChange={(e) => setHostServiceId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Sélectionner un service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Visibilité</p>
              <select
                className="border rounded-md px-3 py-2 text-xs w-full"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
              >
                <option value="enterprise">Toute l'entreprise</option>
                <option value="services">Services sélectionnés</option>
              </select>
            </div>
          </div>

          {visibility === "services" && (
            <div className="border rounded-md p-3 space-y-2">
              <p className="text-xs font-medium">Services autorisés</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {services.map((s) => {
                  const checked = selectedServiceIds.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-xs">
                      <Checkbox checked={checked} onCheckedChange={(v: any) => toggleService(s.id, Boolean(v))} />
                      <span>{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => {
                if (!canSubmit) return;
                createMutation.mutate({
                  name: name.trim(),
                  host_service_id: hostServiceId as number,
                  visibility,
                  services: visibility === "services" ? selectedServiceIds : [],
                });
              }}
            >
              Créer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Dossiers partagés existants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sharedFolders.length === 0 ? (
            <div className="text-xs text-muted-foreground">Aucun dossier partagé</div>
          ) : (
            <div className="space-y-2">
              {sharedFolders.map((sf) => (
                <div key={sf.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{sf.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Visibilité: {sf.visibility === "enterprise" ? "Toute l'entreprise" : "Services sélectionnés"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing({ ...sf, services: sf.services ?? [] });
                        setEditOpen(true);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const ok = window.confirm("Supprimer le partage de ce dossier ?");
                        if (!ok) return;
                        deleteMutation.mutate(sf.id);
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le dossier partagé</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium">Nom</p>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Visibilité</p>
                <select
                  className="border rounded-md px-3 py-2 text-xs w-full"
                  value={editing.visibility}
                  onChange={(e) => setEditing({ ...editing, visibility: e.target.value as any })}
                >
                  <option value="enterprise">Toute l'entreprise</option>
                  <option value="services">Services sélectionnés</option>
                </select>
              </div>
              {editing.visibility === "services" && (
                <div className="border rounded-md p-3 space-y-2">
                  <p className="text-xs font-medium">Services autorisés</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {services.map((s) => {
                      const checked = (editing.services ?? []).includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v: any) => {
                              const next = checked
                                ? (editing.services ?? []).filter((id) => id !== s.id)
                                : ([...(editing.services ?? []), s.id]);
                              setEditing({ ...editing, services: next });
                            }}
                          />
                          <span>{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button
              onClick={() => {
                if (!editing) return;
                updateMutation.mutate({
                  id: editing.id,
                  name: editing.name.trim() || undefined,
                  visibility: editing.visibility,
                  services: editing.visibility === 'services' ? (editing.services ?? []) : [],
                });
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
