export interface AdminEmployee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  enterprise_id: number;
  service_id: number | null;
}
