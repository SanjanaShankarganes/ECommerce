import React, { useState, FormEvent } from 'react';
import { TextField, Button, Typography, Box, Avatar, Container } from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { signup } from '../utils/api';
import { useStore } from '../store/useStore';

interface SignupProps {
  setMessage?: (message: string) => void;
  isLogin?: (value: boolean) => void;
}

const Signup: React.FC<SignupProps> = ({ setMessage, isLogin }) => {
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const { setLoading } = useStore();

    const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true, 'Creating account...');
        try {
            const data = await signup(name, email, password);
            const message = data.message || 'Signup successful';
            if (setMessage) setMessage(message);
            if (isLogin) isLogin(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';
            if (setMessage) setMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <PersonAddOutlinedIcon />
                </Avatar>
                <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
                    Sign up
                </Typography>
                <Box component="form" onSubmit={handleSignup} noValidate sx={{ width: '100%' }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="name"
                        label="Full Name"
                        name="name"
                        autoComplete="name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
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
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Sign Up
                    </Button>
                </Box>
        </Container>
    );
};

export default Signup;

