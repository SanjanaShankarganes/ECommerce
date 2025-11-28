import React, { useState, FormEvent } from 'react';
import { TextField, Button, Typography, Box, Avatar, Container, CircularProgress } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom'; 
import { login } from '../utils/api'; 
import Cookies from 'js-cookie';
import { useStore } from '../store/useStore';

interface LoginProps {
  setMessage?: (message: string) => void;
  setToken?: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ setMessage, setToken }) => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const navigate = useNavigate();
    const { setLoading } = useStore();  

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setLoading(true, 'Logging in...');

        try {
            const data = await login(email, password); 
            
            if (data.token) {  
                Cookies.set('jwt_token', data.token, { expires: 1, path: '' });
                if (setToken) setToken(data.token);
                navigate(`/catalogue?token=${data.token}`);
            } else {
                const message = data.message || 'Login failed';
                if (setMessage) setMessage(message);
                alert(message); 
            }
        } catch (error) {
            console.error('Login failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while logging in. Please try again.';
            if (setMessage) setMessage(errorMessage);
            alert(errorMessage);
        } finally {
            setIsLoading(false);
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
                Sign in
            </Typography>
            <Box component="form" onSubmit={handleLogin} noValidate sx={{ width: '100%' }}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading}
                    sx={{ mt: 3, mb: 2 }}
                >
                    {isLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={20} color="inherit" />
                            <span>Logging in...</span>
                        </Box>
                    ) : (
                        'Sign In'
                    )}
                </Button>
            </Box>
        </Container>
    );
};

export default Login;

