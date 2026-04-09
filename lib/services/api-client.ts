import { ApiError } from './api-error';

export class ApiClient {
  constructor(private baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    let body: unknown;
    
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    if (!response.ok) {
      const message = this.extractErrorMessage(body, response.status);
      throw new ApiError(message, response.status, body);
    }

    return body as T;
  }

  private extractErrorMessage(body: unknown, status: number): string {
    if (body && typeof body === 'object' && 'error' in body) {
      const error = (body as { error: unknown }).error;
      if (typeof error === 'string') {
        return error;
      }
    }

    if (status >= 500) {
      return 'The server is not responding. Please try again later.';
    }
    if (status === 404) {
      return 'The requested resource was not found.';
    }
    if (status === 401) {
      return 'Authentication required.';
    }
    if (status === 403) {
      return 'Access denied.';
    }

    return 'Request failed. Please try again.';
  }
}

export const apiClient = new ApiClient('/api');