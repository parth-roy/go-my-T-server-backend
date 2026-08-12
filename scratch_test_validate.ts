import express from 'express';
import { z } from 'zod';
import { validate } from './src/shared/middleware/validate';

const app = express();
app.use(express.json());

const schema = z.object({
  phone: z.string()
});

app.post('/test', validate(schema), (req, res) => {
  res.json({ success: true, body: req.body });
});

app.use((err: any, req: any, res: any, next: any) => {
  console.log('Error caught:', err);
  res.status(500).json({ error: err.message });
});

const req = { method: 'POST', url: '/test', body: { phone: '123' } } as any;

// We will just start the server and curl it
const server = app.listen(3099, () => {
  console.log('Server running on 3099');
});
