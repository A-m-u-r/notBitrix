import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)
  const status = err.status || err.statusCode || 500
  const message = err.message || 'Внутренняя ошибка сервера'
  res.status(status).json({ message })
}
