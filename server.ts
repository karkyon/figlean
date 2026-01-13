import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'FIGLEAN API Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TODO: FIGLEAN用のAPIエンドポイントをここに追加

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FIGLEAN Backend running on port ${PORT}`);
});
