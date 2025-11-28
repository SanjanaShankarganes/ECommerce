import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
} from "@mui/material";
import {
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  DateRange as DateRangeIcon,
} from "@mui/icons-material";

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

interface CategoryTableProps {
  categories: CategoriesResponse;
  handleClick: (categoryName: string) => void;
}

const CategoryTable: React.FC<CategoryTableProps> = ({ categories, handleClick }) => {
  return (
    <TableContainer component={Paper} elevation={3}>
      <Table sx={{ minWidth: 650 }} aria-label="product categories table">
        <TableHead>
          <TableRow sx={{ backgroundColor: "primary.paper" }}>
            <TableCell>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CategoryIcon sx={{ mr: 1 }} />
                Category ID
              </Box>
            </TableCell>
            <TableCell>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <InventoryIcon sx={{ mr: 1 }} />
                Category Name
              </Box>
            </TableCell>
            <TableCell>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <DateRangeIcon sx={{ mr: 1 }} />
                Date
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.categories?.map((category) => (
            <TableRow
              key={category.categoryid}
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {category.categoryid}
              </TableCell>
              <TableCell
                onClick={() => handleClick(category.categoryname)}
                sx={{ cursor: "pointer", color: "primary.main" }}
              >
                {category.categoryname}
              </TableCell>
              <TableCell>{category.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CategoryTable;

