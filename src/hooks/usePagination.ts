import { useState, useMemo } from 'react';

export const usePagination = <T>(data: T[], itemsPerPage: number = 7) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Reset ke halaman 1 jika data berubah
  const resetPage = () => setCurrentPage(1);
  
  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    resetPage,
    totalItems: data.length
  };
};