const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./routes/api');

require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    // Never let the browser hold a stale HTML shell — otherwise versioned
    // (?v=) asset references inside it can't update. Assets stay cacheable.
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

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
