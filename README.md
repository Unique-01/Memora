# Memora

**Remember anything. Find it when you need it.**

Memora is an AI-powered personal memory assistant that lets you capture everyday information in natural language and retrieve it later using natural-language questions.

Instead of filling out forms, choosing categories, or manually organizing notes, you simply tell Memora what you want to remember. AI interprets the information, structures it into a useful memory, and makes it searchable later.

---

## Inspiration

We often remember important things in the moment, but forget them later.

Where did I put my passport?
Who has my charger?
What did I promise someone?
When did I last do something?

Traditional note-taking requires users to decide what to write, how to organize it, and how to find it again later.

We wanted to make remembering much more natural.

With Memora, you can simply describe something in your own words and let AI understand and organize it for you.

---

## What It Does

Memora turns natural-language statements into structured memories.

For example:

> "I gave David my charger and he said he'll return it tomorrow."

Memora can understand that this is something **borrowed**, identify the item and person, and resolve the relative due date.

Later, you can ask:

> "Who has my charger?"

Instead of manually searching through your memories, Memora interprets the question and provides a natural-language answer along with the relevant memories.

### Memory Types

Memora currently supports four types of memories:

* **Borrowed** — something given or lent to another person and expected back
* **Stored** — something placed or kept somewhere
* **Last Done** — a completed action or activity
* **Promised** — a commitment or future action made by the user

---

## Features

### Natural-Language Capture

Capture memories by simply describing what happened.

No forms, categories, or manual metadata entry are required.

### AI Interpretation

Memora extracts useful structure from natural language, including:

* memory type
* concise title
* summary
* metadata
* relevant dates

Relative dates such as "tomorrow", "yesterday", and "Friday" are resolved using an explicit reference time.

### Browse, Search & Filter

View captured memories in a chronological list.

Memories can be:

* searched by text
* filtered by type
* opened for complete details

### Memory Details

Each memory has a dedicated detail view containing its original content, structured information, metadata, dates, and completion status.

### Completion Tracking

Applicable **Borrowed** and **Promised** memories can be marked as completed or incomplete.

Completed memories are visually distinguished in the memory list.

### Ask Memora

Ask questions naturally instead of manually searching through your memories.

Examples:

> "Who has my charger?"

> "What did I promise Mum?"

Memora interprets the question, retrieves relevant memories, and generates a concise answer while showing the memories behind the answer.

### Safe AI Boundaries

AI output is treated as untrusted input.

Structured model responses pass through application-side validation before they can affect stored data. Unsupported and ambiguous inputs are also handled separately instead of being blindly saved.

---

## How It Works

Memora separates AI interpretation from application logic.

### Capturing a Memory

```text
Natural-language input
        ↓
AI interpretation
        ↓
Structured result
        ↓
Application validation
        ↓
Database
        ↓
Memory UI
```

The AI does not directly write to the database. Its output must satisfy the application's interpretation contract before persistence.

### Asking a Question

```text
Natural-language question
        ↓
Query interpretation
        ↓
Structured query
        ↓
Memory retrieval
        ↓
AI answer generation
        ↓
Answer + relevant memories
```

This allows the AI layer to remain separate from persistence and makes the underlying model replaceable.

---

## AI Architecture

Memora is designed to avoid being tightly coupled to a specific AI provider or model.

The application uses separate interfaces for:

* memory interpretation
* memory query interpretation
* query answer generation

The current implementations use **OpenRouter**, while the rest of the application depends on the interfaces rather than directly depending on the provider.

The AI model can therefore be changed through configuration without rewriting the application's core memory functionality.

### Structured AI Output

Instead of relying on free-form model responses, Memora requests structured JSON Schema output.

The application then validates the response before using it.

This provides a clear boundary between probabilistic AI behavior and deterministic application logic.

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* NestJS
* TypeScript
* Prisma
* PostgreSQL

### AI

* OpenRouter
* Configurable AI model
* Native `fetch`
* Structured JSON Schema responses

No provider-specific SDK is required for the OpenRouter integration.

---

## Project Structure

```text
.
├── api/
│   └── src/
│       └── memories/
│           ├── interpretation/
│           │   ├── providers/
│           │   └── ...
│           ├── query/
│           │   ├── providers/
│           │   └── ...
│           ├── dto/
│           ├── repositories/
│           ├── memories.controller.ts
│           ├── memories.service.ts
│           └── ...
│
└── web/
    └── src/
        ├── components/
        ├── services/
        ├── App.tsx
        └── ...
```

`api/` contains the NestJS backend, memory interpretation and query layers, persistence, and API endpoints.

`web/` contains the React frontend and the Remember, Memories, and Ask experiences.

---

## Local Development

Memora consists of two independent applications.

### API

```bash
cd api
pnpm install
pnpm start:dev
```

The API will be available locally and provides a health check at:

```text
GET /health
```

### Web

```bash
cd web
pnpm install
pnpm dev
```

The frontend will be available at the address provided by the Vite development server.

During local development, the frontend uses the configured Vite development proxy to communicate with the API.

---

## Environment Configuration

The AI integration supports the following environment variables:

```env
OPENROUTER_API_KEY=your_key_here
AI_MODEL=openai/gpt-oss-20b
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### `OPENROUTER_API_KEY`

Your OpenRouter API key.

### `AI_MODEL`

The model used for memory interpretation and querying.

The default is:

```text
openai/gpt-oss-20b
```

The model can be changed without changing the application's AI integration code.

### `OPENROUTER_BASE_URL`

The OpenRouter API base URL.

The default is:

```text
https://openrouter.ai/api/v1
```

Never commit your API key or other credentials to the repository.

---

## Example Usage

### Remember Something

```text
I put my passport in the black backpack.
```

Memora can turn this into:

```text
Type: STORED

Item: passport
Location: black backpack
```

### Track Something Borrowed

```text
I gave David my charger and he said he'll return it tomorrow.
```

Memora can interpret this as:

```text
Type: BORROWED

Item: charger
Person: David
Due: tomorrow
```

### Record a Promise

```text
I promised Mum I'd send the document tomorrow.
```

Memora can interpret this as:

```text
Type: PROMISED

Item: document
Person: Mum
Due: tomorrow
```

### Ask a Question

```text
Who has my charger?
```

or:

```text
What did I promise Mum?
```

Memora interprets the question, retrieves the relevant memories, and generates an answer.

---

## API

The main memory endpoints are:

```text
POST   /memories
POST   /memories/capture
POST   /memories/query
GET    /memories
GET    /memories/:id
PATCH  /memories/:id
DELETE  /memories/:id
```

### Capture

```http
POST /memories/capture
Content-Type: application/json
```

```json
{
  "input": "I gave David my charger and he said he'll return it tomorrow."
}
```

### Query

```http
POST /memories/query
Content-Type: application/json
```

```json
{
  "input": "Who has my charger?"
}
```

---

## Testing

The backend includes automated tests covering the memory interpretation, query, AI provider, validation, persistence, service, and controller layers.

Run the API tests with:

```bash
cd api
pnpm test
```

The project also includes build and lint checks for both applications.

---

## Current Limitations

Memora is an early-stage personal memory assistant.

Some limitations include:

* AI interpretation can occasionally be imperfect.
* Natural-language questions may not always map perfectly to available memories.
* The current memory model focuses on four memory types.
* AI functionality depends on the configured OpenRouter model and provider availability.
* More complex relationships between memories are not currently modeled.

These provide opportunities for improving the system's accuracy and usefulness over time.

---

## What's Next for Memora

Future improvements could include:

* more accurate natural-language retrieval
* richer relationships between memories
* smarter handling of related memories
* reminders for upcoming commitments
* improved personalization
* continued evaluation of different AI models
* additional memory types

The architecture is intentionally designed to make experimenting with different AI models straightforward without requiring changes throughout the application.

---

## Philosophy

Memora is built around a simple idea:

> **You shouldn't have to think about how to organize a memory in order to remember it.**

Just say what happened.

Memora handles the structure so you can focus on remembering what matters.

