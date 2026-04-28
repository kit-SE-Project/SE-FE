declare module "@types" {
  interface Role {
    roleId: number;
    name: string;
    description: string;
    alias: string;
    badgeType?: "CHECK" | "KUMOH_CROW" | null;
    badgePriority?: number | null;
  }

  interface AdminMenuRoll {
    option: string;
    roles: string[];
  }
  interface MenuSettingRole {
    name: string;
    option: string;
    roles: string[];
  }

  interface PutRoleData {
    option: string;
    roles: SelectRoleList[];
  }
  interface SelectRoleList {
    roleName: string;
    roleId: number;
  }
}
