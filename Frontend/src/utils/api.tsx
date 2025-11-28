import axios, { AxiosError } from "axios";

// In production, use relative URL (same origin). In development, use localhost.
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5000/api');

const apiClient = axios.create({
  baseURL: API_URL,
});

interface Category {
  categoryid: number;
  categoryname: string;
  [key: string]: unknown;
}

interface CategoriesResponse {
  categories: Category[];
  totalCategories?: number;
  [key: string]: unknown;
}

interface Product {
  productId: number;
  productName: string;
  categoryName: string;
  numberOfUnits: number;
  mrp: number;
  discountPrice: number;
  description?: string;
  imageUrl?: string | null;
  [key: string]: unknown;
}

interface ProductsResponse {
  products: Product[];
  totalProducts: number;
  [key: string]: unknown;
}

interface SearchResponse {
  products: Product[];
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  [key: string]: unknown;
}

export const getCategories = async (page?: number, limit?: number): Promise<CategoriesResponse> => {
  try {
    const response = await apiClient.get<CategoriesResponse>("/ctable", {
      params: { page, limit },
    });
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError<{ message?: string; [key: string]: unknown }>;
    console.error(err);
    throw new Error(axiosError.response?.data?.message || "No data");
  }
};

export const getProducts = async (
  categoryName: string,
  minPrice: number | string,
  maxPrice: number | string,
  minUnits: number | string,
  maxUnits: number | string,
  page: number,
  limit: number,
  sortBy?: string
): Promise<ProductsResponse> => {
  try {
    const response = await apiClient.get<ProductsResponse>("/ptable", {
      params: {
        categoryName: categoryName,
        minPrice: minPrice || 0,
        maxPrice: maxPrice || Infinity,
        minUnits: minUnits || 0,
        maxUnits: maxUnits || Infinity,
        page,
        limit,
        sortBy: sortBy || 'relevance',
      },
    });
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError<{ message?: string; [key: string]: unknown }>;
    console.error(err);
    throw new Error(axiosError.response?.data?.message || "No data");
  }
};

export const searchProducts = async (
  query: string, 
  categoryName: string[] | string, 
  page: number, 
  limit: number,
  sortBy?: string
): Promise<SearchResponse> => {
  try {
    const response = await apiClient.get<SearchResponse>("/search", {
      params: {
        query,
        categoryName: Array.isArray(categoryName) ? categoryName.join(",") : categoryName || "",
        page,
        limit,
        sortBy: sortBy || 'relevance',
      },
    });
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError<{ message?: string; [key: string]: unknown }>;
    console.error(err);
    throw new Error(axiosError.response?.data?.message || "Search failed");
  }
};

