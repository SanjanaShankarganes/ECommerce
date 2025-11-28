const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const categoryTableRoutes = require('./routes/categoryTable');
const productTableRoutes = require('./routes/productTable');
const cors = require('cors');

const corsOptions = {
    origin: '*',
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
    credentials: false,
};

 
 
const app = express();
app.use(cors(corsOptions))
app.options('*', cors(corsOptions)); // Handle preflight
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', categoryTableRoutes);
app.use('/api', productTableRoutes);

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 5004;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
