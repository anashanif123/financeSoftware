// Consistent success envelope. Errors are shaped by the error middleware.
export function ok(res, data, meta) {
  return res.status(200).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created(res, data) {
  return res.status(201).json({ success: true, data });
}

export function noContent(res) {
  return res.status(204).send();
}

// Build pagination meta from query params + total count.
export function paginate(query, total) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    skip: (page - 1) * limit,
  };
}
