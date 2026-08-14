const { z } = require('zod');
const { validate } = require('./dist/shared/middleware/validate');

const ListDepartmentsSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().uuid().optional(),
  includeArchived: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
  search: z.string().max(100).optional(),
});

const req = {
  query: {} // empty query
};

const res = {};

const next = function(err) {
  if (err) {
    console.error("NEXT CALLED WITH ERROR:");
    console.error(err.stack || err);
  } else {
    console.log("NEXT CALLED WITH NO ERROR");
    console.log("MUTATED REQ.QUERY:", JSON.stringify(req.query));
  }
};

validate(ListDepartmentsSchema, 'query')(req, res, next);
