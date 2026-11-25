import { useCallback, useEffect, useState } from "react";
import {
  getOrganizationById,
  listOrganizations,
} from "../services/organizationService";
import type { Organization } from "../../types/organization";

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export function useOrganizations(pageSize = 100) {
  const [items, setItems] = useState<Organization[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextLink, setNextLink] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    void listOrganizations({ pageSize, signal: controller.signal })
      .then((result) => {
        setItems(result.items);
        setTotalCount(result.totalCount);
        setNextLink(result.nextLink);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotalCount(0);
        setNextLink(undefined);
        setError(getErrorMessage(caught, "Failed to fetch organizations."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [pageSize, refreshVersion]);

  const refetch = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  const fetchNextPage = useCallback(async () => {
    if (!nextLink || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await listOrganizations({ pageSize, nextLink });
      setItems((current) => [...current, ...result.items]);
      setTotalCount(result.totalCount);
      setNextLink(result.nextLink);
    } catch (caught) {
      setError(getErrorMessage(caught, "Failed to fetch organizations."));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nextLink, pageSize]);

  return {
    items,
    totalCount,
    nextLink,
    isLoading,
    error,
    refetch,
    fetchNextPage,
  };
}

export function useOrganization(id?: string) {
  const [item, setItem] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    void getOrganizationById(id, controller.signal)
      .then(setItem)
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setItem(null);
        setError(getErrorMessage(caught, "Failed to fetch the organization."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, refreshVersion]);

  const refetch = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  return { item, isLoading, error, refetch };
}
