/**
 * Error Logger Utility
 * Centralized error logging for frontend
 */

interface ErrorLog {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  additionalData?: Record<string, unknown>;
}

class ErrorLogger {
  private isDevelopment = process.env.NODE_ENV === "development";

  /**
   * Log an error to the console and optionally to an error reporting service
   */
  logError(
    error: Error,
    errorInfo?: {
      componentStack?: string;
      userId?: string;
      userEmail?: string;
      additionalData?: Record<string, unknown>;
    }
  ): void {
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: errorInfo?.userId,
      userEmail: errorInfo?.userEmail,
      additionalData: errorInfo?.additionalData,
    };

    // Always log to console in development
    if (this.isDevelopment) {
      console.error("Application Error:", errorLog);
    }

    // In production, send to error reporting service
    this.sendToErrorService(errorLog);
  }

  /**
   * Log an API error
   */
  logApiError(
    error: {
      message: string;
      status?: number;
      url?: string;
      method?: string;
    },
    userId?: string
  ): void {
    const errorLog: ErrorLog = {
      message: `API Error: ${error.message}`,
      url: error.url || window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId,
      additionalData: {
        status: error.status,
        method: error.method,
      },
    };

    if (this.isDevelopment) {
      console.error("API Error:", errorLog);
    }

    this.sendToErrorService(errorLog);
  }

  /**
   * Send error to error reporting service (e.g., Sentry, LogRocket)
   * Override this method to integrate with your error reporting service
   */
  private sendToErrorService(errorLog: ErrorLog): void {
    // Example integration with Sentry:
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(errorLog.message), {
    //     contexts: {
    //       react: {
    //         componentStack: errorLog.componentStack,
    //       },
    //     },
    //     user: {
    //       id: errorLog.userId,
    //       email: errorLog.userEmail,
    //     },
    //     extra: errorLog.additionalData,
    //   });
    // }

    // Example: Send to your backend logging endpoint
    // fetch('/api/logs/error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorLog),
    // }).catch(() => {
    //   // Silently fail if logging endpoint is unavailable
    // });
  }

  /**
   * Log a warning
   */
  logWarning(message: string, additionalData?: Record<string, unknown>): void {
    const warningLog = {
      message,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      additionalData,
    };

    if (this.isDevelopment) {
      console.warn("Application Warning:", warningLog);
    }

    // Optionally send warnings to error service
    // this.sendToErrorService({ ...warningLog, level: 'warning' });
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();
export default errorLogger;
