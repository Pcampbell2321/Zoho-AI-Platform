const express = require('express');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const projectRoutes = require('./src/routes/projectRoutes');
const planningRoutes = require('./src/routes/planningRoutes');
const codeSearchRoutes = require('./src/routes/codeSearchRoutes');
const codeGenerationRoutes = require('./src/routes/codeGenerationRoutes');

// Initialize express
const app = express();
app.use(express.json());

// Register routes
app.use('/api/project', projectRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/code-search', codeSearchRoutes);
app.use('/api/code-generation', codeGenerationRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Zoho AI Platform API is running' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
