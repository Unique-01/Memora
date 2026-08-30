import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { MemoryInterpreter } from './interpretation/memory-interpreter.interface';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { MemoryRepository } from './repositories/memory.repository';
import { FakeMemoryInterpreter } from './interpretation/fake-memory.interpreter';
import { MEMORY_INTERPRETER } from './interpretation/memory-interpreter.token';
import { MEMORY_QUERY_INTERPRETER } from './query/memory-query-interpreter.token';
import { FakeMemoryQueryInterpreter } from './query/fake-memory-query.interpreter';
import { MEMORY_QUERY_ANSWERER } from './query/memory-query-answerer.token';
import { FakeMemoryQueryAnswerer } from './query/fake-memory-query.answerer';
import { MemoryType } from '../generated/prisma/enums';

const INPUT = 'I gave David my charger and he said he will return it tomorrow.';

/** supertest's res.body is untyped; narrow it explicitly per assertion. */
function bodyOf<T>(res: request.Response): T {
  return res.body as T;
}

type SupertestTarget = Parameters<typeof request>[0];

const supportedRaw = {
  status: 'supported',
  reason: null,
  interpretation: {
    type: 'BORROWED',
    title: 'Charger',
    summary: 'David has your charger and will return it tomorrow.',
    metadata: { item: 'charger', person: 'David', action: 'return' },
    occurredAt: null,
    dueAt: { value: '2026-08-24T14:00:00+01:00', relative: true },
    completedAt: null,
  },
};

interface CreatePayload {
  type: string;
  title: string;
  summary: string;
  content: string;
  metadata: unknown;
  occurredAt: Date | null;
  dueAt: Date | null;
  completedAt: Date | null;
}

describe('POST /memories/capture', () => {
  let app: INestApplication;
  let repository: {
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let interpreter: FakeMemoryInterpreter;

  /** app.getHttpServer() is untyped; wrap it once for supertest calls. */
  function postCapture(payload?: object): request.Test {
    const server = app.getHttpServer() as unknown as SupertestTarget;
    return request(server).post('/memories/capture').send(payload);
  }

  function firstCreatePayload(): CreatePayload {
    const calls = repository.create.mock.calls as unknown as Array<
      [CreatePayload]
    >;
    return calls[0][0];
  }

  const createdMemory = {
    id: 'memory-1',
    type: 'BORROWED',
    title: 'Charger',
    summary: 'David has your charger and will return it tomorrow.',
    content: INPUT,
    metadata: { item: 'charger', person: 'David', action: 'return' },
    occurredAt: null,
    dueAt: new Date('2026-08-24T14:00:00+01:00'),
    completedAt: null,
    createdAt: new Date('2026-08-23T14:00:00Z'),
    updatedAt: new Date('2026-08-23T14:00:00Z'),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockResolvedValue(createdMemory),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [MemoriesController],
      providers: [
        MemoriesService,
        { provide: MemoryRepository, useValue: repository },
        { provide: MEMORY_INTERPRETER, useValue: new FakeMemoryInterpreter() },
        {
          provide: MEMORY_QUERY_INTERPRETER,
          useValue: new FakeMemoryQueryInterpreter(),
        },
        {
          provide: MEMORY_QUERY_ANSWERER,
          useValue: new FakeMemoryQueryAnswerer({
            answer: 'Your passport is in the black backpack.',
          }),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    interpreter = new FakeMemoryInterpreter();
    setInterpreter(interpreter);
  });

  afterEach(async () => {
    await app.close();
  });

  /** Swaps the canned interpreter behind the running application instance. */
  function setInterpreter(implementation: MemoryInterpreter): void {
    app.get(MemoriesService).interpreter = implementation;
  }

  function configureInterpreter(...results: unknown[]): FakeMemoryInterpreter {
    interpreter = new FakeMemoryInterpreter(...results);
    setInterpreter(interpreter);
    return interpreter;
  }

  describe('supported interpretation', () => {
    it('persists a memory whose content is the exact original input', async () => {
      configureInterpreter(supportedRaw);

      const res = await postCapture({ input: INPUT });

      expect(res.status).toBe(201);
      const body = bodyOf<{ content: string; summary: string }>(res);
      expect(body.content).toBe(INPUT);
      expect(body.summary).not.toBe(INPUT);

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BORROWED',
          title: 'Charger',
          summary: 'David has your charger and will return it tomorrow.',
          content: INPUT,
          metadata: { item: 'charger', person: 'David', action: 'return' },
          dueAt: new Date('2026-08-24T14:00:00+01:00'),
          occurredAt: null,
          completedAt: null,
        }),
      );
    });

    it('converts interpreted dates to Date values without persisting the relative flag', async () => {
      configureInterpreter(supportedRaw);

      await postCapture({ input: INPUT });

      const payload = firstCreatePayload();
      expect(payload.dueAt).toBeInstanceOf(Date);
      expect(payload.dueAt.toISOString()).toBe('2026-08-24T13:00:00.000Z');
      expect(JSON.stringify(payload)).not.toContain('"relative"');
    });

    it('supplies an explicit current reference time to the interpreter', async () => {
      configureInterpreter(supportedRaw);
      const before = Date.now() - 1000;

      await postCapture({ input: INPUT });

      expect(interpreter.receivedCalls).toHaveLength(1);
      const referenceTime = new Date(
        interpreter.receivedCalls[0].context.referenceTime,
      );
      expect(referenceTime.getTime()).toBeGreaterThanOrEqual(before);
      expect(referenceTime.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('falls back deterministically when display fields are missing', async () => {
      configureInterpreter({
        ...supportedRaw,
        interpretation: {
          ...supportedRaw.interpretation,
          title: null,
          summary: null,
        },
      });

      const res = await postCapture({ input: INPUT });

      expect(res.status).toBe(201);
      const payload = firstCreatePayload();
      const normalized = INPUT.replace(/\s+/g, ' ').trim();
      const expectedTitle =
        normalized.length <= 60 ? normalized : `${normalized.slice(0, 57)}...`;
      expect(payload.title).toBe(expectedTitle);
      expect(payload.summary).toBe(INPUT);
      expect(payload.content).toBe(INPUT);
    });
  });

  describe('unsupported and ambiguous interpretations', () => {
    it.each([
      [
        'unsupported',
        { status: 'unsupported', reason: 'No supported memory identified' },
      ],
      [
        'ambiguous',
        {
          status: 'ambiguous',
          reason: 'It is unclear whether the charger was borrowed',
        },
      ],
    ] as const)(
      'returns 422 for %s without creating anything',
      async (_name, raw) => {
        configureInterpreter(raw);

        const res = await postCapture({ input: INPUT });

        expect(res.status).toBe(422);
        const body = bodyOf<{ status: string; reason: string | null }>(res);
        expect(body.status).toBe(raw.status);
        expect(body.reason).toBe(raw.reason);
        expect(repository.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('invalid input', () => {
    it.each([
      ['missing input', {}],
      ['non-string input', { input: 42 }],
      ['empty string', { input: '' }],
      ['whitespace-only input', { input: '   \n\t ' }],
    ])(
      'rejects %s with 400 before calling the interpreter',
      async (_name, body) => {
        await postCapture(body);

        expect(repository.create).not.toHaveBeenCalled();
        expect(interpreter.receivedCalls).toHaveLength(0);
      },
    );
  });

  describe('interpreter failure', () => {
    it('propagates infrastructure errors instead of faking unsupported/ambiguous', async () => {
      const failing = {
        interpret: jest
          .fn()
          .mockRejectedValue(
            new Error('OpenRouter request failed with HTTP 500'),
          ),
      };
      setInterpreter(failing);

      const res = await postCapture({ input: INPUT });

      expect(res.status).toBe(500);
      const body = bodyOf<{ message: string; status?: string }>(res);
      expect(body.message).toBe('Internal server error');
      expect(body.status).not.toBe('ambiguous');
      expect(body.status).not.toBe('unsupported');
      expect(repository.create).not.toHaveBeenCalled();
      expect(failing.interpret).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /memories', () => {
    function queryBody(res: request.Response): Memory[] {
      return res.body as Memory[];
    }

    it('returns all memories when no type filter is provided', async () => {
      repository.findAll.mockResolvedValue([createdMemory]);
      configureInterpreter(supportedRaw);

      const res = await request(app.getHttpServer())
        .get('/memories')
        .expect(200);

      const body = queryBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith({
        type: undefined,
        search: undefined,
      });
    });

    it('filters memories by type=BORROWED', async () => {
      repository.findAll.mockResolvedValue([createdMemory]);
      configureInterpreter(supportedRaw);

      const res = await request(app.getHttpServer())
        .get('/memories?type=BORROWED')
        .expect(200);

      const body = queryBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith({
        type: 'BORROWED',
        search: undefined,
      });
    });

    it.each(Object.values(MemoryType))(
      'accepts each valid MemoryType',
      async (type) => {
        repository.findAll.mockResolvedValue([createdMemory]);
        configureInterpreter(supportedRaw);

        const res = await request(app.getHttpServer())
          .get(`/memories?type=${type}`)
          .expect(200);

        const body = queryBody(res);
        expect(Array.isArray(body)).toBe(true);
        expect(repository.findAll).toHaveBeenCalledWith({
          type,
          search: undefined,
        });
      },
    );

    it('accepts search query parameter and passes it to repository', async () => {
      repository.findAll.mockResolvedValue([createdMemory]);
      configureInterpreter(supportedRaw);

      const res = await request(app.getHttpServer())
        .get('/memories?search=passport')
        .expect(200);

      const body = queryBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(repository.findAll).toHaveBeenCalledWith({
        type: undefined,
        search: 'passport',
      });
    });

    it('accepts combined type and search query parameters', async () => {
      repository.findAll.mockResolvedValue([createdMemory]);
      configureInterpreter(supportedRaw);

      const res = await request(app.getHttpServer())
        .get('/memories?type=STORED&search=backpack')
        .expect(200);

      const body = queryBody(res);
      expect(Array.isArray(body)).toBe(true);
      expect(repository.findAll).toHaveBeenCalledWith({
        type: 'STORED',
        search: 'backpack',
      });
    });

    it('returns 400 for an invalid type value', async () => {
      configureInterpreter(supportedRaw);

      await request(app.getHttpServer())
        .get('/memories?type=INVALID')
        .expect(400);
    });

    it('results are ordered by createdAt descending (newest first)', async () => {
      const newer: Memory = {
        id: 'memory-2',
        type: 'STORED',
        title: 'Newer Memory',
        summary: 'A newer memory.',
        content: 'I did something newer.',
        metadata: {},
        occurredAt: null,
        dueAt: null,
        completedAt: null,
        createdAt: new Date('2026-08-28T00:00:00.000Z'),
        updatedAt: new Date('2026-08-28T00:00:00.000Z'),
      };
      const older: Memory = {
        id: 'memory-1',
        type: 'STORED',
        title: 'Older Memory',
        summary: 'An older memory.',
        content: 'I did something older.',
        metadata: {},
        occurredAt: null,
        dueAt: null,
        completedAt: null,
        createdAt: new Date('2026-08-20T00:00:00.000Z'),
        updatedAt: new Date('2026-08-20T00:00:00.000Z'),
      };

      repository.findAll.mockResolvedValue([newer, older]);

      const res = await request(app.getHttpServer())
        .get('/memories')
        .expect(200);

      const body = queryBody(res) as Array<{ id: string }>;
      expect(body[0]?.id).toBe('memory-2');
      expect(body[1]?.id).toBe('memory-1');
    });
  });
});
