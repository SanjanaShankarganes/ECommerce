import React, { useEffect, useState } from 'react';
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
  CircularProgress,
} from '@mui/material';
import { FilterList as FilterListIcon, Search as SearchIcon } from '@mui/icons-material';
import { getCategories, getProducts, searchProducts } from '../utils/api';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

function ProductTable() {
  const location = useLocation();
  const category = location.state?.categoryName.split(' ') || [];

  const [products, setProducts] = useState({ products: [], totalProducts: 0 });
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  const [selectedCategories, setSelectedCategories] = useState(category || []);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minUnits, setMinUnits] = useState('');
  const [maxUnits, setMaxUnits] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Temporary filter states for the dialog
  const [tempSelectedCategories, setTempSelectedCategories] = useState([]);
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  const [tempMinUnits, setTempMinUnits] = useState('');
  const [tempMaxUnits, setTempMaxUnits] = useState('');

  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        setCategories([...new Set(response.categories.map((e) => e.categoryname))]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
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
        limit,
        searchTerm
      );
      setProducts({ products: response.products, totalProducts: response.totalProducts });
    } catch (err) {
      setError('Failed to fetch products. Please try again.');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategories, minPrice, maxPrice, minUnits, maxUnits, page, limit, searchTerm]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
  
    try {
      const { products: searchResults, totalProducts } = await searchProducts(
        searchTerm,
        selectedCategories,
        page + 1,
        limit
      );
  
      console.log(totalProducts);
  
      setProducts({ products: searchResults, totalProducts } || []);
    } catch (err) {
      console.error("Search failed:", err);
      setError("Failed to perform search. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (searchTerm.trim() !== '') {
      handleSearch();
    } else {
      fetchProducts();
    }
  }, [searchTerm, page, limit]);
  

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
        width: '100vw',
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

        {loading ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
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
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={limit}
          onRowsPerPageChange={(event) => setLimit(parseInt(event.target.value, 10))}
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
            onChange={(event, newValue) => setTempSelectedCategories(newValue)}
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
