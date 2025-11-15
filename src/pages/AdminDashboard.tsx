/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockServices, mockUsers, mockDocuments, mockEnterprises } from "@/data/mockData";
import type { Service } from "@/types";
import type { AdminEmployee } from "@/types/admin";
import type { Permission } from "@/components/admin/AdminSettingsPermissions";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { AdminSettingsPermissions } from "@/components/admin/AdminSettingsPermissions";
import { AdminServicesSection } from "@/components/admin/AdminServicesSection";
import { AdminEmployeesSection } from "@/components/admin/AdminEmployeesSection";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, LayoutDashboard, Settings, Briefcase, Users } from "lucide-react";

type AdminTab = "dashboard" | "settings" | "services" | "employees";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();

  const currentEnterprise = user?.enterprise_id
    ? mockEnterprises.find((e) => e.id === user.enterprise_id)
    : null;

  // Données de base
  const [services, setServices] = useState<Service[]>(mockServices);
  const [employees, setEmployees] = useState<AdminEmployee[]>(
    mockUsers
      .filter((u) => u.role === "agent")
      .map((u) => {
        const [firstName, ...lastParts] = u.name.split(" ");
        const lastName = lastParts.join(" ");
        return {
          ...u,
          firstName: firstName || u.name,
          lastName: lastName || "",
          position: "",
        } as AdminEmployee;
      })
  );

  // Formulaire Services
  const [serviceName, setServiceName] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [serviceResponsibleId, setServiceResponsibleId] = useState<number | null>(null);
  const [editServiceResponsibleId, setEditServiceResponsibleId] = useState<number | null>(null);

  const handleAddService = () => {
    if (!serviceName.trim()) return;
    const newService: Service = {
      id: Date.now(),
      name: serviceName.trim(),
      enterprise_id: 1,
    };
    setServices((prev) => [...prev, newService]);
    setServiceName("");
    setServiceResponsibleId(null);
  };

  const handleUpdateService = () => {
    if (!editingService || !editServiceName.trim()) return;
    setServices((prev) =>
      prev.map((s) =>
        s.id === editingService.id
          ? { ...s, name: editServiceName.trim() }
          : s
      )
    );
    setEditingService(null);
    setEditServiceName("");
    setEditServiceResponsibleId(null);
  };

  const handleDeleteService = (id: number) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
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

  const handleAddEmployee = () => {
    if (!employeeFirstName.trim() || !employeeLastName.trim() || !employeeEmail.trim()) return;
    const fullName = `${employeeFirstName.trim()} ${employeeLastName.trim()}`;
    const newEmployee: AdminEmployee = {
      id: Date.now(),
      name: fullName,
      email: employeeEmail.trim(),
      role: "agent",
      service_id: null,
      enterprise_id: 1,
      firstName: employeeFirstName.trim(),
      lastName: employeeLastName.trim(),
      position: employeePosition.trim(),
    };
    setEmployees((prev) => [...prev, newEmployee]);
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
    const fullName = `${editEmployeeFirstName.trim()} ${editEmployeeLastName.trim()}`;
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === editingEmployee.id
          ? {
              ...e,
              name: fullName,
              email: editEmployeeEmail.trim(),
              firstName: editEmployeeFirstName.trim(),
              lastName: editEmployeeLastName.trim(),
              position: editEmployeePosition.trim(),
            }
          : e
      )
    );
    setEditingEmployee(null);
    setEditEmployeeFirstName("");
    setEditEmployeeLastName("");
    setEditEmployeeEmail("");
    setEditEmployeePosition("");
  };

  const handleDeleteEmployee = (id: number) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
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
      // Pour le select des responsables et les membres, on utilise tous les employés existants
      const availableEmployees = employees;

      const handleAddMembersToService = (serviceId: number, memberIds: number[]) => {
        setEmployees((prev) =>
          prev.map((e) =>
            memberIds.includes(e.id)
              ? {
                  ...e,
                  service_id: serviceId,
                }
              : e
          )
        );
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
