const express = require('express');
const bodyParser = require('body-parser');
const categoryTableRoutes = require('./routes/categoryTable');
const productTableRoutes = require('./routes/productTable');
const cors = require('cors');

const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
    credentials: true,
    optionSuccessStatus: 200,
}
 
 
const app = express();
app.use(cors(corsOptions))
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', categoryTableRoutes);
app.use('/api', productTableRoutes);

const PORT = process.env.PORT || 5004;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
