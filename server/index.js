const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./routes/api');

require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', apiRoutes);

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/teacher', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'teacher.html'));
});

app.listen(PORT, () => {
  console.log(`Cyber Escape Room Platform running at http://localhost:${PORT}`);
  console.log(`Teacher dashboard: http://localhost:${PORT}/teacher`);
});
