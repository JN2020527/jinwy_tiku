declare module 'express' {
  export interface Request {
    body: any;
    query: Record<string, any>;
    params: Record<string, string>;
  }

  export interface Response {
    json(body?: any): Response;
    send(body?: any): Response;
    status(code: number): Response;
  }
}
