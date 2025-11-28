import React, { useState } from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import Login from '../components/Login';
import Signup from '../components/Signup';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState<boolean>(true);
    const [message, setMessage] = useState<string>('');
    const [, setToken] = useState<string>('');

    return (
        <Container sx={{height:"100vh", width:"100%", maxWidth:"100vw", overflowX:"hidden", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
                {isLogin ? (
                    <Login setMessage={setMessage} setToken={setToken} />
                ) : (
                    <Signup setMessage={setMessage} isLogin={setIsLogin}/>
                )}
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body1">
                        {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
                    </Typography>
                    <Button 
                        onClick={() => setIsLogin(!isLogin)}
                        variant="text"
                        color="primary"
                    >
                        {isLogin ? 'Signup' : 'Login'}
                    </Button>
                </Box>
                {message && (
                    <Typography variant="body2" color="error" sx={{ mt: 2, textAlign: 'center' }}>
                        {message}
                    </Typography>
                )}
            </Paper>
        </Container>
    );
};

export default Auth;

