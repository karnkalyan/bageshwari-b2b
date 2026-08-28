import "next-auth";
import "next-auth/jwt";

type WorkspaceMembership = {
  sellerId: string;
  sellerSlug: string;
  sellerName: string;
  dealerId: string | null;
  isDefault: boolean;
};

declare module "next-auth" {
  interface User {
    roles?: string[];
    permissions?: string[];
    sellerId?: string | null;
    sellerSlug?: string | null;
    sellerName?: string | null;
    dealerId?: string | null;
    memberships?: WorkspaceMembership[];
  }

  interface Session {
    roles?: string[];
    permissions?: string[];
    sellerId?: string | null;
    sellerSlug?: string | null;
    sellerName?: string | null;
    dealerId?: string | null;
    memberships?: WorkspaceMembership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: string[];
    permissions?: string[];
    sellerId?: string | null;
    sellerSlug?: string | null;
    sellerName?: string | null;
    dealerId?: string | null;
    memberships?: WorkspaceMembership[];
  }
}
