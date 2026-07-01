require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routers
const hierarchyRouter = require('./routes/hierarchy');
const tasksRouter = require('./routes/tasks');
const transcriptsRouter = require('./routes/transcripts');

app.use('/api/hierarchy', hierarchyRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/transcripts', transcriptsRouter);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[FlowDesk Server] Running on http://localhost:${PORT}`);
});
