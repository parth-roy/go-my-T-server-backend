import { RequestContext } from '../context/request-context';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        role: string;
      };
      context?: RequestContext;
    }
  }
}
export {};