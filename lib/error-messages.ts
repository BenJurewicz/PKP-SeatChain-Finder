export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes("enotfound") || message.includes("getaddrinfo")) {
      return "Unable to connect to the server. Please check your internet connection.";
    }
    
    if (message.includes("econnrefused") || message.includes("econnreset")) {
      return "The server is not responding. Please try again later.";
    }
    
    if (message.includes("timeout") || message.includes("etimedout")) {
      return "The request timed out. Please try again.";
    }
    
    if (message.includes("network") || message.includes("fetch failed")) {
      return "Network error. Please check your connection and try again.";
    }
    
    if (message.includes("parse") || message.includes("invalid")) {
      return "The server returned an unexpected response. Please try again.";
    }
    
    if (message.includes("unauthorized") || message.includes("401")) {
      return "Authentication required. Please try uploading a fresh HAR file.";
    }
    
    if (message.includes("forbidden") || message.includes("403")) {
      return "Access denied. Your session may have expired.";
    }
    
    if (message.includes("not found") || message.includes("404")) {
      return "The requested resource was not found.";
    }
    
    return error.message;
  }
  
  return "An unexpected error occurred. Please try again.";
}