import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';
import { useStore } from '../store/useStore';

const GlobalLoader: React.FC = () => {
  const { isLoading, loadingMessage } = useStore();

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
        gap: 2,
      }}
      open={isLoading}
    >
      <CircularProgress color="inherit" />
      {loadingMessage && (
        <Typography variant="h6" component="div">
          {loadingMessage}
        </Typography>
      )}
    </Backdrop>
  );
};

export default GlobalLoader;

