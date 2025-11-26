import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Enterprise {
  id: number;
  name: string;
  admin_name: string;
  email: string;
  storage: number;
}

export const SuperAdminEnterprisesManagement = () => {
  const queryClient = useQueryClient();
  const {
    data: enterprises = [],
    isLoading,
    error,
  } = useQuery<Enterprise[]>({
    queryKey: ["enterprises"],
    queryFn: async () => {
      const res = await apiFetch("/api/enterprises");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement des entreprises");
      }
      return res.json();
    },
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [storage, setStorage] = useState<string>("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<Enterprise | null>(null);
  const [editName, setEditName] = useState("");
  const [editAdminName, setEditAdminName] = useState("");
  const [editStorage, setEditStorage] = useState<string>("");
  const [editEmail, setEditEmail] = useState("");

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      adminName: string;
      email: string;
      storage: number;
    }) => {
      const res = await apiFetch("/api/enterprises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          admin_name: payload.adminName,
          email: payload.email,
          storage: payload.storage,
        }),
        toast: { success: { message: "Entreprise créée" } },
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la création de l'entreprise");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enterprises"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: number;
      name: string;
      adminName: string;
      email: string;
      storage: number;
    }) => {
      const res = await apiFetch(`/api/enterprises/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          admin_name: payload.adminName,
          email: payload.email,
          storage: payload.storage,
        }),
        toast: { success: { message: "Entreprise mise à jour" } },
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour de l'entreprise");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enterprises"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/enterprises/${id}`, { method: "DELETE", toast: { success: { message: "Entreprise supprimée" } } });
      if (!res.ok && res.status !== 204) {
        throw new Error("Erreur lors de la suppression de l'entreprise");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enterprises"] });
    },
  });

  const resetAddForm = () => {
    setName("");
    setAdminName("");
    setStorage("");
    setEmail("");
  };

  const handleAdd = () => {
    if (!name.trim() || !adminName.trim() || !email.trim()) {
      return;
    }
    const storageValue = Number(storage) || 0;
    createMutation.mutate(
      {
        name: name.trim(),
        adminName: adminName.trim(),
        email: email.trim(),
        storage: storageValue,
      },
      {
        onSuccess: () => {
          resetAddForm();
          setIsAddOpen(false);
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const openEdit = (enterprise: Enterprise) => {
    setEditing(enterprise);
    setEditName(enterprise.name ?? "");
    setEditAdminName(enterprise.admin_name ?? "");
    setEditStorage(
      enterprise.storage !== undefined && enterprise.storage !== null
        ? String(enterprise.storage)
        : ""
    );
    setEditEmail(enterprise.email ?? "");
  };

  const handleUpdate = () => {
    if (!editing) return;
    if (!editName.trim() || !editAdminName.trim() || !editEmail.trim()) {
      return;
    }
    const storageValue = Number(editStorage) || 0;
    updateMutation.mutate(
      {
        id: editing.id,
        name: editName.trim(),
        adminName: editAdminName.trim(),
        email: editEmail.trim(),
        storage: storageValue,
      },
      {
        onSuccess: () => {
          setEditing(null);
        },
      },
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des entreprises</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              Ajouter une entreprise
            </Button>
          </div>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Chargement des entreprises...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">
              Erreur lors du chargement des entreprises
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm mt-4">
            {enterprises.map((e) => (
              <Card key={e.id} className="border rounded-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{e.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Administrateur : </span>
                      {e.admin_name ?? "-"}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Stockage : </span>
                      {e.storage !== undefined ? `${e.storage} Go` : "-"}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Email : </span>
                      {e.email ?? "-"}
                    </p>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => openEdit(e)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="text-destructive border-destructive"
                      onClick={() => handleDelete(e.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal d'ajout d'entreprise */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) {
          resetAddForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une entreprise</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Nom de l'entreprise"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Nom de l'administrateur"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Stockage (Go)"
              value={storage}
              onChange={(e) => setStorage(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Email de l'administrateur"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetAddForm();
                  setIsAddOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button type="button" onClick={handleAdd}>
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal d'édition d'entreprise */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'entreprise</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Nom de l'entreprise"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Input
              placeholder="Nom de l'administrateur"
              value={editAdminName}
              onChange={(e) => setEditAdminName(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Stockage (Go)"
              value={editStorage}
              onChange={(e) => setEditStorage(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Email de l'administrateur"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button type="button" onClick={handleUpdate}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
