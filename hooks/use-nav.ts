"use client";

import { useMemo } from "react";
import type { NavItem } from "@/types";
import { useSession } from "@/lib/auth-client";

export function useFilteredNavItems(items: NavItem[]) {
  const { data } = useSession();
  const userRole = data?.user?.role;

  const filteredItems = useMemo(() => {
    const hasAccess = (access?: NavItem["access"]) => {
      if (!access) return true;

      if (access.role) {
        if (!userRole) return false;

        // support string & array
        if (Array.isArray(access.role)) {
          return access.role.includes(userRole);
        }

        return access.role === userRole;
      }

      if (access.plan || access.feature) {
        console.warn(`Plan/feature checks require server-side validation.`);
        return true;
      }

      return true;
    };

    return items
      .map((item) => {
        // filter children
        let filteredChildren = item.items;

        if (item.items && item.items.length > 0) {
          filteredChildren = item.items.filter((child) =>
            hasAccess(child.access),
          );
        }

        return {
          ...item,
          items: filteredChildren,
        };
      })
      .filter((item) => {
        // checking parent access
        const parentAccess = hasAccess(item.access);

        // if has children check if any child has access
        if (item.items && item.items.length > 0) {
          return item.items.length > 0;
        }

        return parentAccess;
      });
  }, [items, userRole]);

  return filteredItems;
}
