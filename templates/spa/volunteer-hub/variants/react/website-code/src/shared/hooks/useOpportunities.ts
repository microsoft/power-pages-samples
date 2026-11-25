import { useCallback, useEffect, useState } from "react";
import {
  getOpportunityById,
  listOpportunities,
} from "../services/opportunityService";
import { isPermissionError as isPowerPagesPermissionError } from "../powerPagesApi";
import type { Opportunity } from "../../types/opportunity";

const MAX_PAGINATION_ITERATIONS = 100;

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export function useOpportunities(pageSize = 100) {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setIsPermissionError(false);

    const fetchCatalog = async () => {
      const allItems: Opportunity[] = [];
      let nextLink: string | undefined;
      let catalogTotalCount = 0;

      for (
        let iteration = 0;
        iteration < MAX_PAGINATION_ITERATIONS;
        iteration += 1
      ) {
        const result = await listOpportunities({
          pageSize,
          nextLink,
          signal: controller.signal,
        });
        allItems.push(...result.items);
        if (iteration === 0) catalogTotalCount = result.totalCount;
        nextLink = result.nextLink;
        if (!nextLink) {
          return {
            items: allItems,
            totalCount: Math.max(catalogTotalCount, allItems.length),
          };
        }
      }

      throw new Error("Opportunity pagination exceeded the safe page limit.");
    };

    void fetchCatalog()
      .then((result) => {
        setItems(result.items);
        setTotalCount(result.totalCount);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotalCount(0);
        setIsPermissionError(isPowerPagesPermissionError(caught));
        setError(getErrorMessage(caught, "Failed to fetch opportunities."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [pageSize, refreshVersion]);

  const refetch = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  return {
    items,
    totalCount,
    isLoading,
    error,
    isPermissionError,
    refetch,
  };
}

export function useOpportunity(id?: string) {
  const [item, setItem] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setIsLoading(false);
      setError(null);
      setIsPermissionError(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setIsPermissionError(false);

    void getOpportunityById(id, controller.signal)
      .then(setItem)
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setItem(null);
        setIsPermissionError(isPowerPagesPermissionError(caught));
        setError(getErrorMessage(caught, "Failed to fetch the opportunity."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, refreshVersion]);

  const refetch = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  return { item, isLoading, error, isPermissionError, refetch };
}
