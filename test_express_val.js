const express = require('express');
const { z } = require('zod');

const app = express();

function validate(schema, target = 'body') {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[target]);
      if (!result.success) return next(result.error);
      
      req[target] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

const ListDepartmentsSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().uuid().optional(),
  includeArchived: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
  search: z.string().max(100).optional(),
});

app.get('/', validate(ListDepartmentsSchema, 'query'), (req, res) => {
  res.json({ ok: true, query: req.query });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

const server = app.listen(0, async () => {
  const port = server.address().port;
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(`http://localhost:${port}/`);
  const data = await res.json();
  console.log(JSON.stringify(data));
  server.close();
});
