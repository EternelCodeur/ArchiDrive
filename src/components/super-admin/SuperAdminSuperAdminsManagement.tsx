import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { User } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 
const fetchSuperAdmins = async (): Promise<User[]> => {
  const response = await fetch(`/api/super-admins`);
  if (!response.ok) {
    throw new Error("Erreur lors du chargement des super administrateurs");
  }
  return response.json();
};

export const SuperAdminSuperAdminsManagement = () => {
  const queryClient = useQueryClient();
  const { data: superAdmins = [], isLoading } = useQuery({
    queryKey: ["super-admins"],
    queryFn: fetchSuperAdmins,
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const resetAddForm = () => {
    setName("");
    setEmail("");
  };

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string }) => {
      const response = await fetch(`/api/super-admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la création du super administrateur");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; name: string; email: string }) => {
      const response = await fetch(`/api/super-admins/${payload.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: payload.name, email: payload.email }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du super administrateur");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/super-admins/${id}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        throw new Error("Erreur lors de la suppression du super administrateur");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
    },
  });

  const handleAdd = () => {
    if (!name.trim() || !email.trim()) {
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      email: email.trim(),
    });

    resetAddForm();
    setIsAddOpen(false);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setEditName(user.name ?? "");
    setEditEmail(user.email ?? "");
  };

  const handleUpdate = () => {
    if (!editing) return;
    if (!editName.trim() || !editEmail.trim()) {
      return;
    }

    updateMutation.mutate({
      id: editing.id,
      name: editName.trim(),
      email: editEmail.trim(),
    });

    setEditing(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des super administrateurs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              Ajouter un super admin
            </Button>
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm mt-4">
            {superAdmins.map((u) => (
              <Card key={u.id} className="border rounded-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{u.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Email : </span>
                      {u.email ?? "-"}
                    </p>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => openEdit(u)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="text-destructive border-destructive"
                      onClick={() => handleDelete(u.id)}
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

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            resetAddForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un super administrateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Nom du super administrateur"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Email du super administrateur"
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

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le super administrateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Nom du super administrateur"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Email du super administrateur"
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
