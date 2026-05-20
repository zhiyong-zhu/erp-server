import { useState, useCallback } from 'react';

interface UsePaginationOptions {
  defaultPageSize?: number;
  defaultPageNum?: number;
}

interface PaginationState {
  pageNum: number;
  pageSize: number;
  total: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { defaultPageSize = 20, defaultPageNum = 1 } = options;

  const [pagination, setPagination] = useState<PaginationState>({
    pageNum: defaultPageNum,
    pageSize: defaultPageSize,
    total: 0,
  });

  const setPageNum = useCallback((pageNum: number) => {
    setPagination((prev) => ({ ...prev, pageNum }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, pageNum: 1 }));
  }, []);

  const setTotal = useCallback((total: number) => {
    setPagination((prev) => ({ ...prev, total }));
  }, []);

  const reset = useCallback(() => {
    setPagination({
      pageNum: defaultPageNum,
      pageSize: defaultPageSize,
      total: 0,
    });
  }, [defaultPageNum, defaultPageSize]);

  return {
    pagination,
    setPageNum,
    setPageSize,
    setTotal,
    reset,
  };
}
