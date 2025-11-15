import type { User } from "./index";

export interface AdminEmployee extends User {
  firstName: string;
  lastName: string;
  position: string;
}
