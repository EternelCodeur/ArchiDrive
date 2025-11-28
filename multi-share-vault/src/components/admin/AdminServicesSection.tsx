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
import type { Service } from "@/types";
import type { AdminEmployee } from "@/types/admin";

interface AdminServicesSectionProps {
  services: Service[];
  serviceName: string;
  onServiceNameChange: (value: string) => void;
  onAddService: () => void;
  editingService: Service | null;
  editServiceName: string;
  onEditServiceNameChange: (value: string) => void;
  onCancelEdit: () => void;
  onUpdateService: () => void;
  onDeleteService: (id: number) => void;
  onEditService: (service: Service) => void;
  availableEmployees: AdminEmployee[];
  responsibleId: number | null;
  onResponsibleChange: (id: number | null) => void;
  editResponsibleId: number | null;
  onEditResponsibleChange: (id: number | null) => void;
  onAddMembersToService: (serviceId: number, memberIds: number[]) => void;
  onRemoveMembersFromService: (serviceId: number, memberIds: number[]) => void;
}

export const AdminServicesSection = ({
  services,
  serviceName,
  onServiceNameChange,
  onAddService,
  editingService,
  editServiceName,
  onEditServiceNameChange,
  onCancelEdit,
  onUpdateService,
  onDeleteService,
  onEditService,
  availableEmployees,
  responsibleId,
  onResponsibleChange,
  editResponsibleId,
  onEditResponsibleChange,
  onAddMembersToService,
  onRemoveMembersFromService,
}: AdminServicesSectionProps) => {
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(services.length / pageSize));

  const paginatedServices = services.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleMemberSelection = (id: number) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const resetMemberSelection = () => {
    setSelectedMembers([]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button">Ajouter un service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un service</DialogTitle>
                <DialogDescription>
                  Renseignez le nom du service et éventuellement son responsable.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                <Input
                  placeholder="Nom du service"
                  value={serviceName}
                  onChange={(e) => onServiceNameChange(e.target.value)}
                />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Responsable du service</p>
                  <select
                    className="border rounded-md px-3 py-2 text-sm w-full"
                    value={responsibleId ?? ""}
                    onChange={(e) =>
                      onResponsibleChange(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Sélectionner un responsable</option>
                    {availableEmployees.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} - {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onServiceNameChange("");
                    onResponsibleChange(null);
                  }}
                >
                  Annuler
                </Button>
                <Button type="button" onClick={onAddService}>
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="border rounded-md overflow-hidden mt-4">
            <div className="grid grid-cols-3 bg-muted text-xs font-medium px-3 py-2">
              <span>Nom</span>
              <span>Nombre de membres</span>
              <span className="text-right">Actions</span>
            </div>
            {paginatedServices.map((s) => {
              const membersCount = availableEmployees.filter(
                (e) => e.service_id === s.id
              ).length;
              const employeesWithoutService = availableEmployees.filter(
                (e) => e.service_id == null
              );
              const employeesInService = availableEmployees.filter(
                (e) => e.service_id === s.id
              );

              return (
                <div
                  key={s.id}
                  className="grid grid-cols-3 items-center text-sm px-3 py-2 border-t"
                >
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground">{membersCount}</span>
                  <div className="flex justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          type="button"
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => resetMemberSelection()}
                        >
                          Ajouter des membres
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajouter des membres au service</DialogTitle>
                          <DialogDescription>
                            Sélectionnez des employés sans service pour les ajouter à ce service.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 mt-4">
                          {employeesWithoutService.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Aucun employé disponible sans service.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-auto">
                              {employeesWithoutService.map((u) => (
                                <label
                                  key={u.id}
                                  className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                                >
                                  <div>
                                    <p>
                                      {u.firstName} {u.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selectedMembers.includes(u.id)}
                                    onChange={() => toggleMemberSelection(u.id)}
                                  />
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetMemberSelection}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (selectedMembers.length > 0) {
                                onAddMembersToService(s.id, selectedMembers);
                                resetMemberSelection();
                              }
                            }}
                          >
                            Ajouter
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          type="button"
                          className="bg-amber-600 text-white hover:bg-amber-700"
                          onClick={() => resetMemberSelection()}
                        >
                          Retirer des membres
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Retirer des membres du service</DialogTitle>
                          <DialogDescription>
                            Sélectionnez des employés de ce service pour les retirer.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 mt-4">
                          {employeesInService.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Aucun membre dans ce service.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-auto">
                              {employeesInService.map((u) => (
                                <label
                                  key={u.id}
                                  className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                                >
                                  <div>
                                    <p>
                                      {u.firstName} {u.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selectedMembers.includes(u.id)}
                                    onChange={() => toggleMemberSelection(u.id)}
                                  />
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetMemberSelection}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (selectedMembers.length > 0) {
                                onRemoveMembersFromService(s.id, selectedMembers);
                                resetMemberSelection();
                              }
                            }}
                          >
                            Retirer
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => onEditService(s)}
                        >
                          Modifier
                        </Button>
                      </DialogTrigger>
                      {editingService && editingService.id === s.id && (
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Modifier le service</DialogTitle>
                          <DialogDescription>
                            Modifiez le nom du service et/ou son responsable puis enregistrez.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 mt-4">
                          <Input
                            placeholder="Nom du service"
                            value={editServiceName}
                            onChange={(e) => onEditServiceNameChange(e.target.value)}
                          />
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Responsable du service
                            </p>
                            <select
                              className="border rounded-md px-3 py-2 text-sm w-full"
                              value={editResponsibleId ?? ""}
                              onChange={(e) =>
                                onEditResponsibleChange(
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                            >
                              <option value="">Sélectionner un responsable</option>
                              {availableEmployees.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.firstName} {u.lastName} - {u.email}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                          <Button type="button" variant="outline" onClick={onCancelEdit}>
                            Annuler
                          </Button>
                          <Button type="button" onClick={onUpdateService}>
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
                    onClick={() => onDeleteService(s.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
          {services.length > pageSize && (
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
    </div>
  );
};
