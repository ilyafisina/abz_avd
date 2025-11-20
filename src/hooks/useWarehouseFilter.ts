import { useAuth } from '../contexts/useAuth';
import type { Product } from '../types';

export const useWarehouseFilter = () => {
  const { user } = useAuth();

  const filterByWarehouse = (products: Product[]): Product[] => {
    if (!user) return products;

    // Admin видит все товары
    if (user.role === 'admin') {
      return products;
    }

    // Manager и warehouseman видят только товары своего warehouse
    if (user.warehouse) {
      return products.filter((product) => product.warehouse === user.warehouse);
    }

    // Если нет warehouse, возвращаем пустой массив
    return [];
  };

  return { filterByWarehouse };
};
