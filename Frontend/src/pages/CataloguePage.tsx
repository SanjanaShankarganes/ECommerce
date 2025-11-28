import { useEffect, useState, useCallback, useRef, ChangeEvent } from 'react';
import { SelectChangeEvent } from '@mui/material';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { FilterList as FilterListIcon, Search as SearchIcon, Menu as MenuIcon } from '@mui/icons-material';
import { getCategories, getProducts, searchProducts } from '../utils/api';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ProgressiveImage from '../components/ProgressiveImage';
import { useInfiniteQuery } from '@tanstack/react-query';

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


interface Category {
  categoryid: number;
  categoryname: string;
  date?: string;
  [key: string]: unknown;
}

interface CategoriesResponse {
  categories: Category[];
  totalCategories?: number;
  [key: string]: unknown;
}

const DRAWER_WIDTH = 280;

function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Initialize state from URL params or defaults
  const getParam = (key: string, defaultValue: string = '') => searchParams.get(key) || defaultValue;
  const getArrayParam = (key: string): string[] => {
    const param = searchParams.get(key);
    return param ? param.split(',').filter(Boolean) : [];
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const limit = 12;

  const [selectedCategories, setSelectedCategories] = useState<string[]>(getArrayParam('categories'));
  const [minPrice, setMinPrice] = useState<string>(getParam('minPrice'));
  const [maxPrice, setMaxPrice] = useState<string>(getParam('maxPrice'));
  const [minUnits, setMinUnits] = useState<string>(getParam('minUnits'));
  const [maxUnits, setMaxUnits] = useState<string>(getParam('maxUnits'));

  const [searchTerm, setSearchTerm] = useState<string>(getParam('search'));
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(getParam('search'));
  const [sortBy, setSortBy] = useState<string>(getParam('sort', 'relevance'));
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setLoading } = useStore();
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Temporary filter states for the dialog
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>([]);
  const [tempMinPrice, setTempMinPrice] = useState<string>('');
  const [tempMaxPrice, setTempMaxPrice] = useState<string>('');
  const [tempMinUnits, setTempMinUnits] = useState<string>('');
  const [tempMaxUnits, setTempMaxUnits] = useState<string>('');

  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  // Function to update URL with current state
  const updateURL = useCallback((updates: {
    search?: string;
    categories?: string[];
    minPrice?: string;
    maxPrice?: string;
    minUnits?: string;
    maxUnits?: string;
    sort?: string;
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
    
    if (updates.sort !== undefined) {
      if (updates.sort && updates.sort !== 'relevance') {
        newParams.set('sort', updates.sort);
      } else {
        newParams.delete('sort');
      }
    }
    
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        setCategories(response.categories);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  // Infinite query for products (when not searching)
  const productsQuery = useInfiniteQuery({
    queryKey: ['products', selectedCategories, minPrice, maxPrice, minUnits, maxUnits, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      const categoryName = selectedCategories.join(',');
      const response = await getProducts(
        categoryName,
        minPrice,
        maxPrice,
        minUnits,
        maxUnits,
        pageParam,
        limit,
        sortBy
      );
      return response;
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.products.length, 0);
      return totalLoaded < lastPage.totalProducts ? allPages.length : undefined;
    },
    enabled: !searchTerm.trim(),
    initialPageParam: 0,
  });

  // Debounce search term - this effect updates debouncedSearchTerm after delay
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      updateURL({ search: searchTerm });
    }, 500); // 500ms debounce delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, updateURL]);

  // Infinite query for search results - uses debouncedSearchTerm in queryKey
  const searchQuery = useInfiniteQuery({
    queryKey: ['search', debouncedSearchTerm, selectedCategories, sortBy],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await searchProducts(
        debouncedSearchTerm,
        selectedCategories,
        pageParam,
        limit,
        sortBy
      );
      return response;
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.products.length, 0);
      return totalLoaded < lastPage.totalProducts ? lastPage.currentPage + 1 : undefined;
    },
    enabled: !!debouncedSearchTerm.trim(),
    initialPageParam: 1,
  });

  // Use the appropriate query based on debounced search term
  const activeQuery = debouncedSearchTerm.trim() ? searchQuery : productsQuery;

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    // URL will be updated by the debounce effect
  };

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setSortBy(value);
    updateURL({ sort: value });
  };

  // Infinite scroll observer
  useEffect(() => {
    const currentQuery = debouncedSearchTerm.trim() ? searchQuery : productsQuery;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentQuery.hasNextPage && !currentQuery.isFetchingNextPage) {
          currentQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [debouncedSearchTerm, searchQuery.hasNextPage, searchQuery.isFetchingNextPage, searchQuery.fetchNextPage, productsQuery.hasNextPage, productsQuery.isFetchingNextPage, productsQuery.fetchNextPage]);

  const handleCategoryClick = (categoryName: string) => {
    const newCategories = categoryName 
      ? (selectedCategories.includes(categoryName) 
          ? selectedCategories.filter(c => c !== categoryName)
          : [...selectedCategories, categoryName])
      : [];
    setSelectedCategories(newCategories);
    updateURL({ categories: newCategories });
  };

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
    updateURL({
      categories: tempSelectedCategories,
      minPrice: tempMinPrice,
      maxPrice: tempMaxPrice,
      minUnits: tempMinUnits,
      maxUnits: tempMaxUnits,
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
    updateURL({
      categories: [],
      minPrice: '',
      maxPrice: '',
      minUnits: '',
      maxUnits: '',
      search: '',
    });
    setFilterOpen(false);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Get product image URL - use imageUrl from DB if available, otherwise use placeholder
  const getProductImage = (product: Product) => {
    if (product.imageUrl && product.imageUrl.trim() !== '') {
      return product.imageUrl;
    }
    // Fallback to placeholder if no image URL
    return `https://picsum.photos/seed/${product.productId}/400/400`;
  };

  const drawer = (
    <Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Categories
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected={selectedCategories.length === 0}
            onClick={() => handleCategoryClick('')}
          >
            <ListItemText primary="All Products" />
          </ListItemButton>
        </ListItem>
        {categories.map((category) => (
          <ListItem key={category.categoryid} disablePadding>
            <ListItemButton
              selected={selectedCategories.includes(category.categoryname as string)}
              onClick={() => handleCategoryClick(category.categoryname as string)}
            >
              <ListItemText primary={category.categoryname} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          backgroundColor: '#ffffff',
        }}
      >
        {/* Header with Search and Filter */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {isMobile && (
            <IconButton onClick={handleDrawerToggle}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            Products
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
          <FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="sort-select-label">Sort By</InputLabel>
            <Select
              labelId="sort-select-label"
              value={sortBy}
              onChange={handleSortChange}
              label="Sort By"
            >
              <MenuItem value="relevance">Relevance</MenuItem>
              <MenuItem value="price-asc">Price: Low to High</MenuItem>
              <MenuItem value="price-desc">Price: High to Low</MenuItem>
              <MenuItem value="name-asc">Name: A to Z</MenuItem>
              <MenuItem value="name-desc">Name: Z to A</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={handleOpenFilter}>
            Filters
          </Button>
        </Box>

        {/* Error Message */}
        {activeQuery.isError && (
          <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
            {activeQuery.error instanceof Error 
              ? activeQuery.error.message 
              : 'Failed to load products. Please try again.'}
          </Typography>
        )}

        {/* Product Grid */}
        <Grid container spacing={3}>
          {activeQuery.data?.pages.map((page) =>
            page.products.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.productId}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <ProgressiveImage
                    src={getProductImage(product)}
                    alt={product.productName}
                    height={200}
                    width="100%"
                    sx={{ objectFit: 'cover' }}
                    fallbackSrc={`https://picsum.photos/seed/${product.productId}/400/400`}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="h2" noWrap>
                      {product.productName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {product.categoryName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                        ₹{product.discountPrice.toFixed(2)}
                      </Typography>
                      {product.mrp > product.discountPrice && (
                        <Typography
                          variant="body2"
                          sx={{
                            textDecoration: 'line-through',
                            color: 'text.secondary',
                          }}
                        >
                          ₹{product.mrp.toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>

        {/* Loading indicator for initial load */}
        {activeQuery.isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* No products message */}
        {activeQuery.data && 
         activeQuery.data.pages[0]?.products.length === 0 && 
         !activeQuery.isLoading && (
          <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No products found
          </Typography>
        )}

        {/* Infinite scroll trigger and loading indicator */}
        <Box
          ref={observerTarget}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100px',
            mt: 4,
          }}
        >
          {activeQuery.isFetchingNextPage && (
            <CircularProgress size={40} />
          )}
        </Box>

        {/* Filter Dialog */}
        <Dialog open={filterOpen} onClose={handleCloseFilter} maxWidth="sm" fullWidth>
          <DialogTitle>Filter Products</DialogTitle>
          <DialogContent>
            <TextField
              label="Min Price"
              type="number"
              value={tempMinPrice}
              inputProps={{ min: 0 }}
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
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="Min Units"
              type="number"
              inputProps={{ min: 0 }}
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
              inputProps={{ min: 0 }}
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
    </Box>
  );
}

export default CataloguePage;

