# AuraHire: AI-Powered Interview Agent

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/raymondhocc/HR-interview-agent-20250930-051457)

AuraHire is a sophisticated, AI-powered web application designed to modernize the initial screening process for HR. It provides a streamlined, interactive chat interface where candidates for 'Office Staff' and 'Beauty Host' roles can undergo a structured interview. The AI agent, powered by Cloudflare Agents, is programmed to ask role-specific questions that assess key competencies, cultural fit, and brand alignment. The application's minimalist and professional design ensures a focused, intuitive, and engaging experience for the candidate, while providing objective, data-driven insights for recruiters. The entire experience is contained within a single, elegant view, emphasizing clarity and ease of use.

## Key Features

-   **AI-Powered Interviews**: Conducts structured, role-based interviews using a powerful AI agent.
-   **Role-Specific Paths**: Tailored interview scripts for 'Office Staff' and 'Beauty Host' positions.
-   **Minimalist Chat UI**: A clean, focused, and visually stunning interface for a professional candidate experience.
-   **Streaming Responses**: AI responses are streamed in real-time for a natural, conversational flow.
-   **Stateful Conversations**: Built on Cloudflare Agents (Durable Objects) to maintain conversation history and state.
-   **Responsive Design**: Flawless user experience across desktop, tablet, and mobile devices.

## Technology Stack

-   **Frontend**:
    -   **Framework**: React (with Vite)
    -   **Language**: TypeScript
    -   **Styling**: Tailwind CSS
    -   **UI Components**: shadcn/ui
    -   **Animation**: Framer Motion
    -   **State Management**: Zustand
-   **Backend**:
    -   **Runtime**: Cloudflare Workers
    -   **Routing**: Hono
    -   **Stateful Logic**: Cloudflare Agents SDK (Durable Objects)
-   **AI Integration**:
    -   Cloudflare AI Gateway
    -   OpenAI SDK

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [Bun](https://bun.sh/) package manager
-   A Cloudflare account

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd aurahire-ai-interviewer
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Configure Environment Variables:**
    The AI capabilities of this application rely on API keys for the Cloudflare AI Gateway.

    Create a `.dev.vars` file in the root of the project and add your credentials:
    ```ini
    # .dev.vars

    # Cloudflare AI Gateway URL
    # Example: https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_NAME/openai
    CF_AI_BASE_URL="your-gateway-url"

    # Cloudflare API Key (or any key configured in your gateway)
    CF_AI_API_KEY="your-api-key"
    ```
    > **Important**: The application's AI chat functionality will not work without these environment variables configured correctly.

### Running in Development Mode

To start the local development server, which includes the Vite frontend and a local Wrangler instance for the worker, run:

```bash
bun dev
```

The application will be available at `http://localhost:3000`.

## Deployment

This project is designed for seamless deployment to Cloudflare Pages.

1.  **Deploy via Wrangler CLI:**
    Ensure you are logged into your Cloudflare account (`npx wrangler login`). Then, run the deployment script:
    ```bash
    bun run deploy
    ```
    This command will build the application and deploy it using Wrangler.

2.  **Configure Production Secrets:**
    After deployment, you must add your `CF_AI_API_KEY` as a secret in the Cloudflare dashboard for your deployed worker.
    -   Navigate to your Worker in the Cloudflare dashboard.
    -   Go to **Settings** > **Variables**.
    -   Under **Environment Variable Secrets**, add `CF_AI_API_KEY` with its value.

3.  **Deploy with the Cloudflare Button:**
    Click the button below to deploy this repository to your own Cloudflare account with a single click.

    [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/raymondhocc/HR-interview-agent-20250930-051457)

## Project Structure

-   `src/`: Contains the frontend React application code.
    -   `pages/`: Main page components for the application.
    -   `components/`: Reusable UI components, including shadcn/ui elements.
    -   `lib/`: Utility functions and client-side services.
-   `worker/`: Contains the backend Cloudflare Worker and Agent code.
    -   `agent.ts`: The core `ChatAgent` Durable Object class.
    -   `chat.ts`: Handles AI model interaction and prompt engineering.
    -   `userRoutes.ts`: Defines the API routes for the application.
    -   `index.ts`: The entry point for the Cloudflare Worker.
-   `wrangler.toml`: Configuration file for the Cloudflare Worker, including bindings.

## License

This project is licensed under the MIT License.