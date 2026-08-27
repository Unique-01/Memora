/**
 * NestJS injection token for the application's `MemoryInterpreter`.
 *
 * The composition root binds exactly one implementation to this token.
 * Consumers inject `MemoryInterpreter` through this symbol and remain unaware
 * of which implementation (an AI provider, a local model, or a test fake)
 * backs it: swapping providers changes only the binding, never consumers,
 * the interpretation contract, or the Memory domain.
 */
export const MEMORY_INTERPRETER = Symbol('MEMORY_INTERPRETER');
