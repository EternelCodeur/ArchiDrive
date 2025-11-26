import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AdminEmployee } from "@/types/admin";

interface AdminEmployeesSectionProps {
  employees: AdminEmployee[];
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  onAddEmployee: () => void;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
  editingEmployee: AdminEmployee | null;
  editFirstName: string;
  editLastName: string;
  editEmail: string;
  editPosition: string;
  onEditFirstNameChange: (value: string) => void;
  onEditLastNameChange: (value: string) => void;
  onEditEmailChange: (value: string) => void;
  onEditPositionChange: (value: string) => void;
  onCancelEdit: () => void;
  onUpdateEmployee: () => void;
  onDeleteEmployee: (id: number) => void;
  onStartEdit: (employee: AdminEmployee) => void;
}

export const AdminEmployeesSection = ({
  employees,
  firstName,
  lastName,
  email,
  position,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPositionChange,
  onAddEmployee,
  addOpen,
  onAddOpenChange,
  editingEmployee,
  editFirstName,
  editLastName,
  editEmail,
  editPosition,
  onEditFirstNameChange,
  onEditLastNameChange,
  onEditEmailChange,
  onEditPositionChange,
  onCancelEdit,
  onUpdateEmployee,
  onDeleteEmployee,
  onStartEdit,
}: AdminEmployeesSectionProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(employees.length / pageSize));

  const paginatedEmployees = employees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Employés</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Dialog open={addOpen} onOpenChange={onAddOpenChange}>
            <DialogTrigger asChild>
              <Button type="button">Ajouter un employé</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un employé</DialogTitle>
                <DialogDescription>
                  Saisissez les informations de l'employé puis validez pour l'ajouter.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <Input
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => onFirstNameChange(e.target.value)}
                />
                <Input
                  placeholder="Nom"
                  value={lastName}
                  onChange={(e) => onLastNameChange(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                />
                <Input
                  placeholder="Poste"
                  value={position}
                  onChange={(e) => onPositionChange(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onFirstNameChange("");
                    onLastNameChange("");
                    onEmailChange("");
                    onPositionChange("");
                    onAddOpenChange(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="button" onClick={onAddEmployee}>
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="border rounded-md overflow-hidden mt-4">
            <div className="grid grid-cols-4 bg-muted text-xs font-medium px-3 py-2">
              <span>Nom complet</span>
              <span>Email</span>
              <span>Poste</span>
              <span className="text-right">Actions</span>
            </div>
            {paginatedEmployees.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-4 items-center text-sm px-3 py-2 border-t"
              >
                <span>
                  {u.firstName} {u.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
                <span className="text-xs text-muted-foreground">{u.position}</span>
                <div className="flex justify-end gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          onStartEdit(u);
                          onEditFirstNameChange(u.firstName);
                          onEditLastNameChange(u.lastName);
                          onEditEmailChange(u.email);
                          onEditPositionChange(u.position ?? "");
                        }}
                      >
                        Modifier
                      </Button>
                    </DialogTrigger>
                    {editingEmployee && editingEmployee.id === u.id && (
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Modifier l'employé</DialogTitle>
                          <DialogDescription>
                            Mettez à jour les informations de cet employé puis enregistrez.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          <Input
                            placeholder="Prénom"
                            value={editFirstName}
                            onChange={(e) => onEditFirstNameChange(e.target.value)}
                          />
                          <Input
                            placeholder="Nom"
                            value={editLastName}
                            onChange={(e) => onEditLastNameChange(e.target.value)}
                          />
                          <Input
                            type="email"
                            placeholder="Email"
                            value={editEmail}
                            onChange={(e) => onEditEmailChange(e.target.value)}
                          />
                          <Input
                            placeholder="Poste"
                            value={editPosition}
                            onChange={(e) => onEditPositionChange(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                          <Button type="button" variant="outline" onClick={onCancelEdit}>
                            Annuler
                          </Button>
                          <Button type="button" onClick={onUpdateEmployee}>
                            Enregistrer
                          </Button>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    className="text-destructive border-destructive"
                    onClick={() => onDeleteEmployee(u.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {employees.length > pageSize && (
            <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <span>
                Page {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Les formulaires sont maintenant gérés via des modales */}
    </div>
  );
};
