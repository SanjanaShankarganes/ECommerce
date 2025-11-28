import { useEffect, useState, useCallback, useRef, ChangeEvent, MouseEvent } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TablePagination,
  Box,
  Container,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField,
  InputAdornment,
} from '@mui/material';
import { FilterList as FilterListIcon, Search as SearchIcon } from '@mui/icons-material';
import { getCategories, getProducts, searchProducts } from '../utils/api';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';

interface Product {
  productId: number;
  productName: string;
  categoryName: string;
  numberOfUnits: number;
  mrp: number;
  discountPrice: number;
  description?: string;
  [key: string]: unknown;
}

interface ProductsState {
  products: Product[];
  totalProducts: number;
}

function ProductTable() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryName = (location.state as { categoryName?: string })?.categoryName || '';
  const category = categoryName ? categoryName.split(' ') : [];

  // Initialize state from URL params or defaults
  const getParam = (key: string, defaultValue: string = '') => searchParams.get(key) || defaultValue;
  const getArrayParam = (key: string): string[] => {
    const param = searchParams.get(key);
    return param ? param.split(',').filter(Boolean) : [];
  };
  const getNumberParam = (key: string, defaultValue: number = 0) => {
    const param = searchParams.get(key);
    return param ? parseInt(param, 10) : defaultValue;
  };

  const [products, setProducts] = useState<ProductsState>({ products: [], totalProducts: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState<number>(getNumberParam('page', 0));
  const [limit, setLimit] = useState<number>(getNumberParam('limit', 10));

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    getArrayParam('categories').length > 0 ? getArrayParam('categories') : (category || [])
  );
  const [minPrice, setMinPrice] = useState<string>(getParam('minPrice'));
  const [maxPrice, setMaxPrice] = useState<string>(getParam('maxPrice'));
  const [minUnits, setMinUnits] = useState<string>(getParam('minUnits'));
  const [maxUnits, setMaxUnits] = useState<string>(getParam('maxUnits'));

  const [searchTerm, setSearchTerm] = useState<string>(getParam('search'));
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setLoading } = useStore();

  // Function to update URL with current state
  const updateURL = useCallback((updates: {
    search?: string;
    categories?: string[];
    minPrice?: string;
    maxPrice?: string;
    minUnits?: string;
    maxUnits?: string;
    page?: number;
    limit?: number;
  }) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (updates.search !== undefined) {
      if (updates.search.trim()) {
        newParams.set('search', updates.search);
      } else {
        newParams.delete('search');
      }
    }
    
    if (updates.categories !== undefined) {
      if (updates.categories.length > 0) {
        newParams.set('categories', updates.categories.join(','));
      } else {
        newParams.delete('categories');
      }
    }
    
    if (updates.minPrice !== undefined) {
      if (updates.minPrice) {
        newParams.set('minPrice', updates.minPrice);
      } else {
        newParams.delete('minPrice');
      }
    }
    
    if (updates.maxPrice !== undefined) {
      if (updates.maxPrice) {
        newParams.set('maxPrice', updates.maxPrice);
      } else {
        newParams.delete('maxPrice');
      }
    }
    
    if (updates.minUnits !== undefined) {
      if (updates.minUnits) {
        newParams.set('minUnits', updates.minUnits);
      } else {
        newParams.delete('minUnits');
      }
    }
    
    if (updates.maxUnits !== undefined) {
      if (updates.maxUnits) {
        newParams.set('maxUnits', updates.maxUnits);
      } else {
        newParams.delete('maxUnits');
      }
    }
    
    if (updates.page !== undefined) {
      if (updates.page > 0) {
        newParams.set('page', updates.page.toString());
      } else {
        newParams.delete('page');
      }
    }
    
    if (updates.limit !== undefined) {
      if (updates.limit !== 10) {
        newParams.set('limit', updates.limit.toString());
      } else {
        newParams.delete('limit');
      }
    }
    
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Temporary filter states for the dialog
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>([]);
  const [tempMinPrice, setTempMinPrice] = useState<string>('');
  const [tempMaxPrice, setTempMaxPrice] = useState<string>('');
  const [tempMinUnits, setTempMinUnits] = useState<string>('');
  const [tempMaxUnits, setTempMaxUnits] = useState<string>('');

  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        setCategories([...new Set(response.categories.map((e) => e.categoryname as string))]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true, 'Loading products...');
    setError(null);

    const categoryName = selectedCategories.join(',');
    
    try {
      const response = await getProducts(
        categoryName,
        minPrice,
        maxPrice,
        minUnits,
        maxUnits,
        page,
        limit
      );
      setProducts({ products: response.products, totalProducts: response.totalProducts });
    } catch (err) {
      setError('Failed to fetch products. Please try again.');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategories, minPrice, maxPrice, minUnits, maxUnits, page, limit, setLoading]);

  useEffect(() => {
    // Only fetch products if there's no search term
    if (!searchTerm.trim()) {
      fetchProducts();
    }
  }, [selectedCategories, minPrice, maxPrice, minUnits, maxUnits, page, limit, searchTerm, fetchProducts]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    setPage(0);
    updateURL({ search: value, page: 0 });

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      if (value.trim() !== '') {
        setLoading(true, 'Searching products...');
        setError(null);
        try {
          const { products: searchResults, totalProducts } = await searchProducts(
            value,
            selectedCategories,
            1, // Reset to page 1 when searching
            limit
          );
          setProducts({ 
            products: searchResults || [], 
            totalProducts: totalProducts || 0 
          });
          updateURL({ search: value, page: 0 });
        } catch (err) {
          console.error("Search failed:", err);
          setError("Failed to perform search. Please try again.");
        } finally {
          setLoading(false);
        }
      } else {
        // If search is cleared, fetch regular products
        updateURL({ search: '', page: 0 });
        fetchProducts();
      }
    }, 500); // 500ms debounce delay
  };

  // Handle page/limit changes when searching (no debounce needed for pagination)
  useEffect(() => {
    // Only trigger search on page/limit changes, not on searchTerm changes
    // searchTerm changes are handled by the debounced handleSearchChange
    if (searchTerm.trim() !== '') {
      const performSearch = async () => {
        setLoading(true, 'Loading products...');
        setError(null);
        try {
          const { products: searchResults, totalProducts } = await searchProducts(
            searchTerm,
            selectedCategories,
            page + 1,
            limit
          );
          setProducts({ 
            products: searchResults || [], 
            totalProducts: totalProducts || 0 
          });
          updateURL({ page, limit });
        } catch (err) {
          console.error("Search failed:", err);
          setError("Failed to perform search. Please try again.");
        } finally {
          setLoading(false);
        }
      };
      performSearch();
    }
    // Only trigger on page/limit changes, not searchTerm (handled by debounced handleSearchChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  

  const handleOpenFilter = () => {
    setTempSelectedCategories(selectedCategories);
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
    setTempMinUnits(minUnits);
    setTempMaxUnits(maxUnits);
    setFilterOpen(true);
  };

  const handleCloseFilter = () => setFilterOpen(false);

  const handleApplyFilters = () => {
    if (tempMinPrice && tempMaxPrice && Number(tempMinPrice) > Number(tempMaxPrice)) {
      alert('Min Price cannot be greater than Max Price');
      return;
    }
    if (tempMinUnits && tempMaxUnits && Number(tempMinUnits) > Number(tempMaxUnits)) {
      alert('Min Units cannot be greater than Max Units');
      return;
    }

    setSelectedCategories(tempSelectedCategories);
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    setMinUnits(tempMinUnits);
    setMaxUnits(tempMaxUnits);
    setPage(0);
    updateURL({
      categories: tempSelectedCategories,
      minPrice: tempMinPrice,
      maxPrice: tempMaxPrice,
      minUnits: tempMinUnits,
      maxUnits: tempMaxUnits,
      page: 0
    });
    setFilterOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setMinUnits('');
    setMaxUnits('');
    setSearchTerm('');
    setPage(0);
    updateURL({
      categories: [],
      minPrice: '',
      maxPrice: '',
      minUnits: '',
      maxUnits: '',
      search: '',
      page: 0
    });
    fetchProducts();
    setFilterOpen(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            my: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Product List
          </Typography>

          <TextField
            variant="outlined"
            size="small"
            placeholder="Search products..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, maxWidth: '400px' }}
          />

          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={handleOpenFilter}>
            Filter Products
          </Button>
        </Box>

        {error ? (
          <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
            {error}
          </Typography>
        ) : (
          <TableContainer component={Paper} elevation={3}>
            <Table className="min-w-full" aria-label="product table">
              <TableHead>
                <TableRow className="bg-gray-100">
                  <TableCell>S.no</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Category Name</TableCell>
                  <TableCell>Number of Units</TableCell>
                  <TableCell>MRP</TableCell>
                  <TableCell>Discount Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products?.products?.map((product, index) => (
                  <TableRow key={product.productId}>
                    <TableCell>{index+1}</TableCell>
                    <TableCell>{product.productName}</TableCell>
                    <TableCell>{product.categoryName}</TableCell>
                    <TableCell>{product.numberOfUnits}</TableCell>
                    <TableCell>₹{product.mrp.toFixed(2)}</TableCell>
                    <TableCell>₹{product.discountPrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={products.totalProducts || 0}
          page={page}
          onPageChange={(_event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
            setPage(newPage);
            updateURL({ page: newPage });
          }}
          rowsPerPage={limit}
          onRowsPerPageChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const newLimit = parseInt(event.target.value, 10);
            setLimit(newLimit);
            setPage(0);
            updateURL({ limit: newLimit, page: 0 });
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Container>

      <Dialog open={filterOpen} onClose={handleCloseFilter}>
        <DialogTitle>Filter Products</DialogTitle>

        <DialogContent sx={{ width: '40vw', height: '40vh' }}>
          <Autocomplete
            multiple
            options={categories || []}
            getOptionLabel={(option) => option}
            value={tempSelectedCategories}
            onChange={(_event, newValue) => setTempSelectedCategories(newValue)}
            renderInput={(params) => <TextField {...params} label="Filter by Category" variant="outlined" />}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Min Price"
            type="number"
            value={tempMinPrice}
            onChange={(e) => setTempMinPrice(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
            fullWidth
          />
          <TextField
            label="Max Price"
            type="number"
            value={tempMaxPrice}
            onChange={(e) => setTempMaxPrice(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
            fullWidth
          />

          <TextField
            label="Min Units"
            type="number"
            value={tempMinUnits}
            onChange={(e) => setTempMinUnits(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
            fullWidth
          />
          <TextField
            label="Max Units"
            type="number"
            value={tempMaxUnits}
            onChange={(e) => setTempMaxUnits(e.target.value)}
            variant="outlined"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFilter}>Cancel</Button>
          <Button onClick={handleClearFilters} color="error">
            Clear Filters
          </Button>
          <Button onClick={handleApplyFilters} variant="contained" color="primary">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProductTable;

