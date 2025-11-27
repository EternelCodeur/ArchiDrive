/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockDocuments, mockEnterprises } from "@/data/mockData";
import type { Service } from "@/types";
import type { AdminEmployee } from "@/types/admin";
import type { Permission } from "@/components/admin/AdminSettingsPermissions";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { AdminSettingsPermissions } from "@/components/admin/AdminSettingsPermissions";
import { AdminServicesSection } from "@/components/admin/AdminServicesSection";
import { AdminEmployeesSection } from "@/components/admin/AdminEmployeesSection";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, LayoutDashboard, Settings, Briefcase, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useEffect } from "react";
import { toast } from "sonner";

type AdminTab = "dashboard" | "settings" | "services" | "employees";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();

  const currentEnterprise = user?.enterprise_id
    ? mockEnterprises.find((e) => e.id === user.enterprise_id)
    : null;

  const queryClient = useQueryClient();

  const { data: services = [] } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async (): Promise<Service[]> => {
      const res = await apiFetch(`/api/admin/services`);
      if (!res.ok) {
        throw new Error("Erreur lors du chargement des services");
      }
      return res.json();
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async (): Promise<AdminEmployee[]> => {
      const res = await apiFetch(`/api/admin/employees`);
      if (!res.ok) {
        throw new Error("Erreur lors du chargement des employés");
      }
      const data = await res.json();
      return (data as any[]).map((e) => ({
        id: e.id,
        firstName: e.first_name,
        lastName: e.last_name,
        email: e.email,
        position: e.position ?? "",
        enterprise_id: e.enterprise_id,
        service_id: e.service_id,
      } as AdminEmployee));
    },
  });

  useEffect(() => {
    const es1 = new EventSource(`/api/events/services`, { withCredentials: true });
    const onServices = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    };
    es1.addEventListener("services", onServices as EventListener);
    const es2 = new EventSource(`/api/events/employees`, { withCredentials: true });
    const onEmployees = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    };
    es2.addEventListener("employees", onEmployees as EventListener);
    return () => {
      es1.removeEventListener("services", onServices as EventListener);
      es1.close();
      es2.removeEventListener("employees", onEmployees as EventListener);
      es2.close();
    };
  }, [queryClient]);

  // Formulaire Services
  const [serviceName, setServiceName] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [serviceResponsibleId, setServiceResponsibleId] = useState<number | null>(null);
  const [editServiceResponsibleId, setEditServiceResponsibleId] = useState<number | null>(null);

  const createServiceMutation = useMutation({
    mutationFn: async (payload: { name: string; responsible_employee_id: number | null }) => {
      const res = await apiFetch(`/api/admin/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        toast: { success: { message: "Service créé" } },
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la création du service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (payload: { id: number; name: string; responsible_employee_id: number | null }) => {
      const res = await apiFetch(`/api/admin/services/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name, responsible_employee_id: payload.responsible_employee_id }),
        toast: { success: { message: "Service mis à jour" } },
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour du service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/admin/services/${id}`, {
        method: "DELETE",
        toast: { success: { message: "Service supprimé" } },
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Erreur lors de la suppression du service");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    },
  });

  const assignMembersMutation = useMutation({
    mutationFn: async (payload: { serviceId: number; memberIds: number[] }) => {
      const res = await apiFetch(`/api/admin/services/${payload.serviceId}/assign-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_ids: payload.memberIds }),
        toast: { success: { message: "Membres ajoutés au service" } },
      });
      if (!res.ok) {
        throw new Error("Erreur lors de l'ajout des membres au service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
  });

  const handleAddService = () => {
    if (!serviceName.trim()) return;
    createServiceMutation.mutate({ name: serviceName.trim(), responsible_employee_id: serviceResponsibleId });
    setServiceName("");
    setServiceResponsibleId(null);
  };

  const handleUpdateService = () => {
    if (!editingService || !editServiceName.trim()) return;
    updateServiceMutation.mutate({ id: editingService.id, name: editServiceName.trim(), responsible_employee_id: editServiceResponsibleId });
    setEditingService(null);
    setEditServiceName("");
    setEditServiceResponsibleId(null);
  };

  const handleDeleteService = (id: number) => {
    deleteServiceMutation.mutate(id);
  };

  // Formulaire Employés (nom, prénom, email, poste)
  const [employeeFirstName, setEmployeeFirstName] = useState("");
  const [employeeLastName, setEmployeeLastName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePosition, setEmployeePosition] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<AdminEmployee | null>(null);
  const [editEmployeeFirstName, setEditEmployeeFirstName] = useState("");
  const [editEmployeeLastName, setEditEmployeeLastName] = useState("");
  const [editEmployeeEmail, setEditEmployeeEmail] = useState("");
  const [editEmployeePosition, setEditEmployeePosition] = useState("");
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: { first_name: string; last_name: string; email: string; position: string; service_id: number | null }) => {
      const res = await apiFetch(`/api/admin/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        toast: { success: { message: "Employé créé" } },
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la création de l'employé");
      }
      return res.json();
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["admin-employees"] });
      const previous = queryClient.getQueryData<AdminEmployee[]>(["admin-employees"]) || [];
      const optimistic: AdminEmployee = {
        id: -Date.now(),
        firstName: payload.first_name,
        lastName: payload.last_name,
        email: payload.email,
        position: payload.position ?? "",
        enterprise_id: user?.enterprise_id ?? 0,
        service_id: payload.service_id ?? null,
      };
      queryClient.setQueryData<AdminEmployee[]>(["admin-employees"], [optimistic, ...previous]);
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData<AdminEmployee[]>(["admin-employees"], context.previous);
      }
    },
    onSuccess: () => {
      setAddEmployeeOpen(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (payload: { id: number; first_name: string; last_name: string; email: string; position: string; service_id: number | null }) => {
      const res = await apiFetch(`/api/admin/employees/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: payload.first_name, last_name: payload.last_name, email: payload.email, position: payload.position, service_id: payload.service_id }),
        toast: { success: { message: "Employé mis à jour" } },
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour de l'employé");
      }
      return res.json();
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["admin-employees"] });
      const previous = queryClient.getQueryData<AdminEmployee[]>(["admin-employees"]) || [];
      const next = previous.map((e) =>
        e.id === payload.id
          ? { ...e, firstName: payload.first_name, lastName: payload.last_name, email: payload.email, position: payload.position }
          : e
      );
      queryClient.setQueryData<AdminEmployee[]>(["admin-employees"], next);
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData<AdminEmployee[]>(["admin-employees"], context.previous);
      }
    },
    onSuccess: () => {
      setEditingEmployee(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/admin/employees/${id}`, {
        method: "DELETE",
        toast: { success: { message: "Employé supprimé" } },
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Erreur lors de la suppression de l'employé");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
  });

  const handleAddEmployee = () => {
    if (!employeeFirstName.trim() || !employeeLastName.trim() || !employeeEmail.trim()) {
      toast.error("Veuillez renseigner prénom, nom et email");
      return;
    }
    createEmployeeMutation.mutate({ first_name: employeeFirstName.trim(), last_name: employeeLastName.trim(), email: employeeEmail.trim(), position: employeePosition.trim(), service_id: null });
    setAddEmployeeOpen(false);
    setEmployeeFirstName("");
    setEmployeeLastName("");
    setEmployeeEmail("");
    setEmployeePosition("");
  };

  const handleUpdateEmployee = () => {
    if (
      !editingEmployee ||
      !editEmployeeFirstName.trim() ||
      !editEmployeeLastName.trim() ||
      !editEmployeeEmail.trim()
    )
      return;
    updateEmployeeMutation.mutate({ id: editingEmployee.id, first_name: editEmployeeFirstName.trim(), last_name: editEmployeeLastName.trim(), email: editEmployeeEmail.trim(), position: editEmployeePosition.trim(), service_id: editingEmployee.service_id ?? null });
    setEditingEmployee(null);
    setEditEmployeeFirstName("");
    setEditEmployeeLastName("");
    setEditEmployeeEmail("");
    setEditEmployeePosition("");
  };

  const handleDeleteEmployee = (id: number) => {
    deleteEmployeeMutation.mutate(id);
  };

  const [permissions, setPermissions] = useState<Record<number, Permission>>(() => {
    const initial: Record<number, Permission> = {};
    employees.forEach((u) => {
      initial[u.id] = {
        viewAllFolders: false,
        deleteDocuments: false,
      };
    });
    return initial;
  });

  const togglePermission = (userId: number, key: keyof Permission, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: value,
      },
    }));
  };

  const renderContent = () => {
    // Dashboard
    if (activeTab === "dashboard") {
      const totalDocuments = mockDocuments.length;
      const totalEmployees = employees.length;
      const totalServices = services.length;
      const totalStorage = 1000; // valeur simulée
      const weeklyActivity = [12, 5, 18, 9, 14, 7, 11];

      return (
        <AdminDashboardOverview
          totalDocuments={totalDocuments}
          totalEmployees={totalEmployees}
          totalServices={totalServices}
          totalStorage={totalStorage}
          weeklyActivity={weeklyActivity}
        />
      );
    }

    // Paramètres & permissions
    if (activeTab === "settings") {
      return (
        <AdminSettingsPermissions
          employees={employees}
          permissions={permissions}
          togglePermission={togglePermission}
        />
      );
    }

    // Services (CRUD)
    if (activeTab === "services") {
      const availableEmployees = employees;

      const handleAddMembersToService = (serviceId: number, memberIds: number[]) => {
        assignMembersMutation.mutate({ serviceId, memberIds });
      };



      return (
        <AdminServicesSection
          services={services}
          serviceName={serviceName}
          onServiceNameChange={setServiceName}
          onAddService={handleAddService}
          editingService={editingService}
          editServiceName={editServiceName}
          onEditServiceNameChange={setEditServiceName}
          onCancelEdit={() => setEditingService(null)}
          onUpdateService={handleUpdateService}
          onDeleteService={handleDeleteService}
          onEditService={(service) => {
            setEditingService(service);
            setEditServiceName(service.name);
            setEditServiceResponsibleId(null);
          }}
          availableEmployees={availableEmployees}
          responsibleId={serviceResponsibleId}
          onResponsibleChange={setServiceResponsibleId}
          editResponsibleId={editServiceResponsibleId}
          onEditResponsibleChange={setEditServiceResponsibleId}
          onAddMembersToService={handleAddMembersToService}
        />
      );
    }

    // Employés (CRUD)
    return (
      <AdminEmployeesSection
        employees={employees}
        firstName={employeeFirstName}
        lastName={employeeLastName}
        email={employeeEmail}
        position={employeePosition}
        onFirstNameChange={setEmployeeFirstName}
        onLastNameChange={setEmployeeLastName}
        onEmailChange={setEmployeeEmail}
        onPositionChange={setEmployeePosition}
        onAddEmployee={handleAddEmployee}
        addOpen={addEmployeeOpen}
        onAddOpenChange={setAddEmployeeOpen}
        editingEmployee={editingEmployee}
        editFirstName={editEmployeeFirstName}
        editLastName={editEmployeeLastName}
        editEmail={editEmployeeEmail}
        editPosition={editEmployeePosition}
        onEditFirstNameChange={setEditEmployeeFirstName}
        onEditLastNameChange={setEditEmployeeLastName}
        onEditEmailChange={setEditEmployeeEmail}
        onEditPositionChange={setEditEmployeePosition}
        onCancelEdit={() => setEditingEmployee(null)}
        onUpdateEmployee={handleUpdateEmployee}
        onDeleteEmployee={handleDeleteEmployee}
        onStartEdit={(employee) => setEditingEmployee(employee)}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex">
        {/* Sidebar Admin */}
        <aside
          className={`${sidebarCollapsed ? "w-16" : "w-56"} border-r bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900/90 p-4 space-y-4 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto text-slate-100`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {currentEnterprise?.name ?? "Mon entreprise"}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-8 w-8 shrink-0"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className={`w-full ${sidebarCollapsed ? "justify-center" : "justify-start"} gap-2`}
              size="sm"
              type="button"
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard className="w-4 h-4" />
              {!sidebarCollapsed && <span>Tableau de bord</span>}
            </Button>
            <Button
              variant={activeTab === "settings" ? "default" : "ghost"}
              className={`w-full ${sidebarCollapsed ? "justify-center" : "justify-start"} gap-2`}
              size="sm"
              type="button"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="w-4 h-4" />
              {!sidebarCollapsed && <span>Paramètres</span>}
            </Button>
            <Button
              variant={activeTab === "services" ? "default" : "ghost"}
              className={`w-full ${sidebarCollapsed ? "justify-center" : "justify-start"} gap-2`}
              size="sm"
              type="button"
              onClick={() => setActiveTab("services")}
            >
              <Briefcase className="w-4 h-4" />
              {!sidebarCollapsed && <span>Services</span>}
            </Button>
            <Button
              variant={activeTab === "employees" ? "default" : "ghost"}
              className={`w-full ${sidebarCollapsed ? "justify-center" : "justify-start"} gap-2`}
              size="sm"
              type="button"
              onClick={() => setActiveTab("employees")}
            >
              <Users className="w-4 h-4" />
              {!sidebarCollapsed && <span>Employés</span>}
            </Button>
          </div>
        </aside>

        {/* Contenu principal */}
        <section className="flex-1 p-6 space-y-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>Gestion de l'entreprise</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Espace administrateur : gérez les paramètres, les services et les employés de votre
                entreprise.
              </p>
            </CardContent>
          </Card>

          {renderContent()}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
