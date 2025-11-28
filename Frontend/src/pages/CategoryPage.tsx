import React, { useEffect, useState, ChangeEvent, MouseEvent } from 'react';
import { 
  Typography, 
  Container,
  Box,
  TablePagination,
  Button,
} from '@mui/material';

import { getCategories } from '../utils/api';
import CategoryTable from '../components/CategoryTable';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

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

const CustomerTable: React.FC = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoriesResponse>({ 
    categories: [], 
    totalCategories: 0 
  });
  const [page, setPage] = useState<number>(0); 
  const [limit, setLimit] = useState<number>(10);
  const { setLoading } = useStore(); 

  const handleChangePage = (_event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLimit(Number(event.target.value));
    setPage(0); 
  };

  const handleProductsClick = (categoryName: string) => {
    navigate('/ptable', { state: { categoryName } });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true, 'Loading categories...');
      try {
        const categoryData = await getCategories(page + 1, limit); 
        setCategories(categoryData); 
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, limit, setLoading]);

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
        <Box sx={{ my: 4 }}>
          <Box sx={{ my: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Category List
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" onClick={() => handleProductsClick('')}>
                All Products
              </Button>
              {/* <Button variant="outlined">
                Add Category
              </Button> */}
            </Box>
          </Box>
          <CategoryTable categories={categories} handleClick={handleProductsClick} /> 

          <TablePagination
            component="div"
            count={categories.totalCategories || 0}  
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]} 
          />
        </Box>
      </Container>
    </Box>
  );
};

export default CustomerTable;

