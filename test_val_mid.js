const { z } = require('zod');
const { validate } = require('./dist/shared/middleware/validate.js');

const ListDepartmentsSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().uuid().optional(),
  includeArchived: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
  search: z.string().max(100).optional(),
});

const req = { query: {} };
const res = {};
const next = (err) => {
  if (err) console.log("ERR:", err);
  else console.log("OK, req.query is:", req.query);
};

const middleware = validate(ListDepartmentsSchema, 'query');
middleware(req, res, next);
