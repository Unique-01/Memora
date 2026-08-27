import { Test } from '@nestjs/testing';
import { FakeMemoryInterpreter } from './fake-memory.interpreter';
import { MEMORY_INTERPRETER } from './memory-interpreter.token';
import type { MemoryInterpretationResult } from './memory-interpretation.types';
import type {
  InterpretationContext,
  MemoryInterpreter,
} from './memory-interpreter.interface';

const REFERENCE_TIME = '2026-08-23T14:00:00+01:00';

const supportedFixture = {
  status: 'supported',
  interpretation: {
    type: 'STORED',
    title: 'Passport',
    summary: 'Passport is in the black backpack.',
    metadata: { item: 'passport', location: 'black backpack' },
    occurredAt: null,
    dueAt: null,
    completedAt: null,
  },
};

const ambiguousFixture = {
  status: 'ambiguous',
  reason: 'Could not determine what happened to the charger.',
};

/**
 * Stand-in for production application code (e.g. a future capture flow).
 * It receives an interpreter through the interface only and has no knowledge
 * of which implementation backs it.
 */
function applicationFlow(
  interpreter: MemoryInterpreter,
  input: string,
): Promise<MemoryInterpretationResult> {
  const context: InterpretationContext = { referenceTime: REFERENCE_TIME };
  return interpreter.interpret(input, context);
}

describe('MemoryInterpreter provider boundary', () => {
  it('application flow works against one implementation without knowing it', async () => {
    const interpreter = new FakeMemoryInterpreter(supportedFixture);

    const result = await applicationFlow(
      interpreter,
      'I put my passport in the black backpack.',
    );

    expect(result.status).toBe('supported');
    expect(interpreter.receivedCalls).toHaveLength(1);
    expect(interpreter.receivedCalls[0].context.referenceTime).toBe(
      REFERENCE_TIME,
    );
  });

  it('swapping the implementation changes nothing in the application flow', async () => {
    const interpreter = new FakeMemoryInterpreter(ambiguousFixture);

    const result = await applicationFlow(interpreter, 'David has my charger.');

    expect(result.status).toBe('ambiguous');
    if (result.status === 'ambiguous') {
      expect(result.reason).toContain('charger');
    }
  });

  it('resolves implementations through the MEMORY_INTERPRETER injection token', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: MEMORY_INTERPRETER,
          useValue: new FakeMemoryInterpreter(supportedFixture),
        },
      ],
    }).compile();

    const interpreter = moduleRef.get<MemoryInterpreter>(MEMORY_INTERPRETER);

    const result = await interpreter.interpret('anything', {
      referenceTime: REFERENCE_TIME,
    });
    expect(result.status).toBe('supported');
  });

  it('rejects fake results that violate the interpretation contract', async () => {
    const interpreter = new FakeMemoryInterpreter({
      status: 'supported',
      interpretation: { type: 'BORROWED', inventedField: true },
    });

    await expect(
      applicationFlow(interpreter, 'I gave David my charger.'),
    ).rejects.toThrow(/unexpected interpretation keys/);
  });
});
