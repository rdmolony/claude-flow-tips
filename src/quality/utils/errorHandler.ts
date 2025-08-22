/**
 * Error handling utilities for the quality improvement system
 */

export class QualityError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'QualityError';
  }
}

export class ValidationError extends QualityError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, 'validator', operation, originalError);
    this.name = 'ValidationError';
  }
}

export class NormalizationError extends QualityError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, 'normalizer', operation, originalError);
    this.name = 'NormalizationError';
  }
}

export class ScoringError extends QualityError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, 'scorer', operation, originalError);
    this.name = 'ScoringError';
  }
}

export class ImprovementError extends QualityError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, 'improver', operation, originalError);
    this.name = 'ImprovementError';
  }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  /**
   * Safely execute a function with error handling
   */
  static async safeExecute<T>(
    operation: () => Promise<T> | T,
    component: string,
    operationName: string,
    fallback?: () => T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const qualityError = new QualityError(
        `Error in ${component}.${operationName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        component,
        operationName,
        error instanceof Error ? error : undefined
      );

      if (fallback) {
        console.warn(`${component}.${operationName} failed, using fallback:`, qualityError.message);
        return fallback();
      }

      throw qualityError;
    }
  }

  /**
   * Validate input parameters
   */
  static validateInput(
    value: unknown,
    paramName: string,
    component: string,
    operation: string,
    validators: Array<(value: unknown) => boolean> = []
  ): void {
    if (value === null || value === undefined) {
      throw new ValidationError(
        `Parameter '${paramName}' cannot be null or undefined`,
        `${component}.${operation}`
      );
    }

    for (const validator of validators) {
      if (!validator(value)) {
        throw new ValidationError(
          `Parameter '${paramName}' failed validation`,
          `${component}.${operation}`
        );
      }
    }
  }

  /**
   * Validate text input specifically
   */
  static validateTextInput(text: unknown, component: string, operation: string): asserts text is string {
    ErrorHandler.validateInput(text, 'text', component, operation, [
      (value): value is string => typeof value === 'string'
    ]);
  }

  /**
   * Handle and log errors appropriately
   */
  static handleError(error: Error, context: { component: string; operation: string; input?: unknown }): never {
    const errorMessage = `[${context.component}.${context.operation}] ${error.message}`;
    
    // Log error details for debugging
    console.error(errorMessage, {
      error: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    // Re-throw as QualityError if not already one
    if (error instanceof QualityError) {
      throw error;
    }

    throw new QualityError(
      error.message,
      context.component,
      context.operation,
      error
    );
  }

  /**
   * Create a safe wrapper for async operations
   */
  static createSafeWrapper<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    component: string,
    operation: string,
    fallback?: (...args: TArgs) => TReturn
  ) {
    return async (...args: TArgs): Promise<TReturn> => {
      return ErrorHandler.safeExecute(
        () => fn(...args),
        component,
        operation,
        fallback ? () => fallback(...args) : undefined
      );
    };
  }

  /**
   * Create a safe wrapper for sync operations
   */
  static createSafeSyncWrapper<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    component: string,
    operation: string,
    fallback?: (...args: TArgs) => TReturn
  ) {
    return (...args: TArgs): TReturn => {
      try {
        return fn(...args);
      } catch (error) {
        const qualityError = new QualityError(
          `Error in ${component}.${operation}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          component,
          operation,
          error instanceof Error ? error : undefined
        );

        if (fallback) {
          console.warn(`${component}.${operation} failed, using fallback:`, qualityError.message);
          return fallback(...args);
        }

        throw qualityError;
      }
    };
  }

  /**
   * Validate configuration objects
   */
  static validateConfig<T extends Record<string, unknown>>(
    config: T,
    requiredFields: (keyof T)[],
    component: string,
    operation: string
  ): void {
    for (const field of requiredFields) {
      if (config[field] === undefined || config[field] === null) {
        throw new ValidationError(
          `Required configuration field '${String(field)}' is missing`,
          `${component}.${operation}`
        );
      }
    }
  }

  /**
   * Create error with context information
   */
  static createContextualError(
    message: string,
    component: string,
    operation: string,
    context?: Record<string, unknown>
  ): QualityError {
    const contextString = context ? ` Context: ${JSON.stringify(context)}` : '';
    return new QualityError(
      `${message}${contextString}`,
      component,
      operation
    );
  }
}

/**
 * Utility functions for common validations
 */
export const validators = {
  isString: (value: unknown): value is string => typeof value === 'string',
  isNumber: (value: unknown): value is number => typeof value === 'number' && !isNaN(value),
  isPositiveNumber: (value: unknown): value is number => 
    typeof value === 'number' && !isNaN(value) && value > 0,
  isNonEmptyString: (value: unknown): value is string => 
    typeof value === 'string' && value.trim().length > 0,
  isArray: (value: unknown): value is unknown[] => Array.isArray(value),
  isObject: (value: unknown): value is Record<string, unknown> => 
    typeof value === 'object' && value !== null && !Array.isArray(value),
  isInRange: (min: number, max: number) => (value: unknown): value is number =>
    typeof value === 'number' && !isNaN(value) && value >= min && value <= max
};