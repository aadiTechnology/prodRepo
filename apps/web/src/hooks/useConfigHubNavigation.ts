import { useCallback } from "react";
import {
  useLocation,
  useNavigate,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from "react-router-dom";
import type { NavLink } from "../components/layout/PageHeader";

export const CONFIG_HUB_PATH = "/configuration";

export type ConfigHubLocationState = {
  fromConfigHub?: boolean;
  fromInternal?: boolean;
};

export function useConfigHubNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const fromConfigHub = Boolean(
    (location.state as ConfigHubLocationState | null)?.fromConfigHub
  );

  const navigateWithConfigHub = useCallback(
    ((to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }

      const mergedState = fromConfigHub
        ? { ...((options?.state as object | undefined) ?? {}), fromConfigHub: true }
        : options?.state;

      navigate(to, { ...options, state: mergedState });
    }) as NavigateFunction,
    [navigate, fromConfigHub]
  );

  const buildListBreadcrumbs = useCallback(
    (pageTitle: string): NavLink[] =>
      fromConfigHub
        ? [
            { title: "Basic Configuration", path: CONFIG_HUB_PATH },
            { title: pageTitle, path: "#" },
          ]
        : [{ title: pageTitle, path: "#" }],
    [fromConfigHub]
  );

  const buildFormBreadcrumbs = useCallback(
    (
      listSegment: { title: string; path: string },
      currentTitle: string
    ): NavLink[] => {
      const listLink: NavLink = { title: listSegment.title, path: listSegment.path };

      if (fromConfigHub) {
        return [
          { title: "Basic Configuration", path: CONFIG_HUB_PATH },
          listLink,
          { title: currentTitle, path: "#" },
        ];
      }

      return [listLink, { title: currentTitle, path: "#" }];
    },
    [fromConfigHub]
  );

  const navigateToList = useCallback(
    (listPath: string) => {
      navigateWithConfigHub(listPath);
    },
    [navigateWithConfigHub]
  );

  return {
    fromConfigHub,
    navigateWithConfigHub,
    buildListBreadcrumbs,
    buildFormBreadcrumbs,
    navigateToList,
  };
}
