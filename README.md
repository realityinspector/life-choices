# Sundial: Life Time Management Application

![Sundial Logo](./generated-icon.png)

## Overview

Sundial is a sophisticated lifetime management application that transforms time perception through an advanced, interactive sundial visualization. Empowering users to visualize and optimize their time allocation at a lifetime scale, Sundial offers a unique perspective on how daily activities accumulate and impact one's life journey.

## Features

### 📊 Interactive Sundial Visualization
- Visual representation of life progress on a 12-hour clock (6am to 6pm) metaphor
- Real-time calculation of life percentage lived and remaining
- Color-coded activity bands showing proportion of lifetime allocated to each pursuit

### ⏱️ Budget of Conscious Hours (BCH)
- Calculates total waking hours in your lifetime based on age, life expectancy, and sleep patterns
- Tracks used and remaining conscious hours
- Visualizes how your planned activities will consume your remaining time

### 🎯 Activity Management
- Create, edit, and track regular activities with customizable:
  - Frequency (daily, weekly, monthly, yearly)
  - Duration (minutes or hours)
  - Life impact (positive or negative effect on life expectancy)
  - Color-coding for visual organization
- Pre-defined templates for common activities (Work, Exercise, Family Time, Learning)
- Activity statistics showing lifetime hours and percentage allocation

### 🔮 Time Machine Projections
- Project your time allocation to any future age
- Visualize how your current activities will accumulate over time
- Calculate projected life impact and updated life expectancy
- See allocation breakdown at different life stages

### 👤 User Profile Management
- Personalize calculations based on your age, life expectancy, and sleep patterns
- Track changes to your life parameters over time

## Technology Stack

### Frontend
- React with TypeScript for type-safe component development
- D3.js for advanced data visualization and interactive sundial
- Tailwind CSS with ShadCN UI components for responsive design
- React Query for efficient data fetching and state management
- React Hook Form for form handling with Zod validation

### Backend
- Express.js server with TypeScript
- PostgreSQL database with Drizzle ORM
- RESTful API architecture with secure user authentication
- Session-based authentication with Passport.js

### Data Modeling & Calculations
- Sophisticated algorithms for time projections and lifetime calculations
- Detailed metrics for lifetime hour allocation and life impact assessment

## Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- PostgreSQL database

### Installation

1. Clone the repository
   ```
   git clone https://github.com/your-username/sundial-app.git
   cd sundial-app
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables (create a `.env` file in the project root)
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/sundial
   ```

4. Push the database schema
   ```
   npm run db:push
   ```

5. Start the development server
   ```
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5000`

## Usage Guide

### Account Setup
1. Create a new account with username and password
2. Enter your basic information:
   - Name
   - Current age
   - Estimated life expectancy
   - Average daily sleep hours

### Dashboard
- View your life sundial visualization
- Check key metrics like percentage of life lived and remaining years
- See your Budget of Conscious Hours (BCH) statistics
- Access quick actions to manage activities and profile

### Managing Activities
1. Navigate to the Activities tab
2. Add new activities with:
   - Name and category
   - Frequency and duration
   - Estimated life impact (positive or negative)
   - Color coding
3. View activity statistics and summaries
4. Edit or delete activities as needed

### Using the Time Machine
1. Go to the Time Machine tab
2. Adjust the age slider to project to a specific future point
3. View projected statistics, including:
   - Life percentage completed at that age
   - Conscious hours used and remaining
   - Activity accumulation and allocation percentages
   - Net life impact and adjusted life expectancy

### Profile Management
- Update your personal information as needed
- Adjust life expectancy or sleep patterns to refine calculations

## Core Concepts

### Budget of Conscious Hours (BCH)
BCH represents your total waking hours throughout your lifetime. It's calculated by:
```
Total Life in Hours (Life Expectancy × 365 × 24) - Total Sleep (Life Expectancy × 365 × Daily Sleep Hours)
```

### Activity Lifetime Hours
For each activity, lifetime hours are calculated based on frequency, duration, and your remaining lifespan:
```
Hours Per Year = Duration (in hours) × Frequency × Time Units Per Year
Lifetime Hours = Hours Per Year × (Life Expectancy - Current Age)
```

### Life Impact
Activities can positively or negatively impact your life expectancy. The net impact is calculated by summing the individual impacts of all activities.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- D3.js community for visualization tools
- React ecosystem for powerful frontend capabilities
- All contributors who have helped shape this project






# instructions for changes integrating realtime voice agents 

Below is an updated version of the README with new code snippets reflecting a modern, realtime integration between Twilio’s Voice API (using Media Streams) and OpenAI’s conversational endpoints. The examples use Node.js (Express and WebSocket) on the backend and a simple React hook on the frontend. Adjust as needed for your project’s context.

---

# AI Voice Agent Management Platform

A comprehensive management platform for AI voice agents, enabling seamless configuration, monitoring, and deployment of OpenAI-powered communication agents integrated with Twilio phone services.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Server Implementation](#server-implementation)
  - [Storage Interface](#storage-interface)
  - [API Routes](#api-routes)
  - [Voice Service](#voice-service)
  - [Authentication](#authentication)
- [Client Implementation](#client-implementation)
  - [Pages and Routing](#pages-and-routing)
  - [State Management](#state-management)
  - [Components](#components)
- [OpenAI Integration](#openai-integration)
- [Twilio Integration](#twilio-integration)
- [WebSocket Implementation](#websocket-implementation)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)

## Overview

This platform provides businesses with a complete solution for managing AI-powered voice agents that can handle incoming calls using OpenAI’s advanced language models integrated with Twilio’s telephony services. The application allows users to create, configure, and monitor AI agents, assign phone numbers, manage response templates, and track call logs.

## Architecture

The application follows a modern full-stack JavaScript architecture:

- **Frontend**: React.js with TypeScript, utilizing React Query for data fetching, Tailwind CSS for styling, and shadcn/ui components library
- **Backend**: Express.js server handling API requests, WebSocket communication, and integration with third-party services
- **Data Layer**: In-memory storage implementation with interfaces for potential database migration
- **External Services**: OpenAI API for conversational AI and Twilio for telephony services

The application is built with a clear separation of concerns:

1. **Client**: Responsible for UI rendering, user interactions, and data presentation
2. **Server**: Handles data persistence, business logic, authentication, and third-party API integration
3. **Shared**: Contains common schema definitions ensuring type consistency between frontend and backend

## Data Model

The core data model is defined in `shared/schema.ts` and includes:

- **Users**: Authentication and user management
- **Agents**: AI voice agents with personality and behavior configurations
- **Phone Numbers**: Twilio phone numbers assigned to agents
- **Templates**: Reusable response templates for agents
- **Call Logs**: Records of all calls handled by agents
- **Settings**: Application-wide configuration for API keys and preferences

All schemas are defined using Drizzle ORM with PostgreSQL adapters and Zod for validation. Each entity has:
- Type definitions for database operations (Select/Insert)
- Validation schemas for form handling and API requests
- Relationship definitions between entities

## Server Implementation

### Storage Interface

The server uses a storage abstraction layer defined in `server/storage.ts` which provides an interface (`IStorage`) for all data operations. This allows for easy switching between storage implementations:

- **MemStorage**: In-memory implementation for development and testing
- (Extensible for database implementations)

The storage interface handles all CRUD operations for each entity, including:
- User authentication operations
- Agent management
- Phone number assignment
- Template storage
- Call logging
- Dashboard statistics and activity tracking

### API Routes

API endpoints are implemented in `server/routes.ts` and follow RESTful conventions. All routes:
- Use the storage interface for data operations
- Validate request payloads using Zod schemas
- Return appropriate HTTP status codes and JSON responses
- Handle error cases consistently

Key API route categories include:
- Dashboard statistics and activity feeds
- Agent management (CRUD)
- Phone number management (CRUD with assignment)
- Template management (CRUD)
- Call log recording and retrieval
- Settings management

### Voice Service

The voice service in `server/services/voice-service.ts` handles incoming calls from Twilio and processes them with OpenAI. It performs the following:

1. **Call Handling**: Processes incoming Twilio webhooks and generates TwiML responses.
2. **WebSocket Relay**: Bridges Twilio’s media stream with OpenAI for realtime processing.
3. **AI Configuration**: Sets up OpenAI sessions based on agent settings.

#### Sample Twilio Webhook & TwiML Generation

```js
// server/routes/voiceWebhook.js
const express = require('express');
const { VoiceResponse } = require('twilio').twiml;
const router = express.Router();

router.post('/webhook/twilio/voice', (req, res) => {
  const twiml = new VoiceResponse();
  // Start a media stream to our WebSocket server
  twiml.start().stream({
    url: 'wss://yourdomain.com/voice-stream',
    track: 'inbound'
  });
  twiml.say('Hello. Please leave your message after the tone.');
  res.type('text/xml');
  res.send(twiml.toString());
});

module.exports = router;
```

#### WebSocket Server: Bridging Twilio Audio to OpenAI

```js
// server/services/voice-stream.js
const WebSocket = require('ws');
const { Configuration, OpenAIApi } = require('openai');

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.event === 'media') {
        // Extract audio chunk (base64 encoded)
        const audioData = msg.media.payload;

        // Buffer/process audio data and transcribe (implement transcribeAudio as needed)
        const transcript = await transcribeAudio(audioData);

        // Query OpenAI with the transcribed text
        const aiResponse = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a voice assistant." },
            { role: "user", content: transcript }
          ]
        });

        // Return AI-generated response (for further processing or TTS conversion)
        ws.send(JSON.stringify({
          event: 'ai_response',
          data: aiResponse.data.choices[0].message.content
        }));
      }
    } catch (error) {
      console.error('Error processing audio stream:', error);
    }
  });
});

// Placeholder: Implement integration with OpenAI Whisper or other transcription services
async function transcribeAudio(audioData) {
  // Process base64 audio data and return a transcript string
  return "transcribed text"; // Replace with actual transcription logic
}

module.exports = wss;
```

### Authentication

Authentication is implemented in `server/auth.ts` using Passport.js with a local strategy:

- Password hashing using secure methods
- Session management with Express session
- Protected routes requiring authentication
- User registration and login flows

## Client Implementation

### Pages and Routing

The client application uses `wouter` for routing and implements these main pages:

- **Dashboard**: Overview of system statistics and recent activity
- **Agents**: Management of AI voice agents
- **Phone Numbers**: Phone number assignment and configuration
- **Templates**: Response template management
- **Logs**: Call history and transcripts
- **Settings**: Application configuration
- **Auth Pages**: Login and registration

Routing is defined in `client/src/App.tsx` with protected routes managed by `client/src/lib/protected-route.tsx`.

### State Management

State management uses a combination of:

- **React Query**: For server state management, data fetching, and mutations
- **Context API**: For application-wide state like authentication and theme
- **Local state**: For component-specific UI state

Key contexts include:
- `AuthContext`: User authentication state
- `ThemeContext`: Application theme preferences
- `WebSocketContext`: WebSocket connection state

### Components

The UI is built with a component hierarchy:

1. **Layout Components**: Overall application structure (AppLayout, Sidebar)
2. **Page Components**: Main content for each route
3. **Feature Components**: Domain-specific components (AgentForm, PhoneTable)
4. **UI Components**: Reusable UI elements from shadcn/ui

Common UI patterns include:
- Data tables with sorting and filtering
- Forms with validation
- Modal dialogs for CRUD operations
- Status indicators and badges
- Charts and statistics displays

## OpenAI Integration

The OpenAI integration is central to the platform’s AI voice functionality.

### Configuration

- API key management via environment variables
- Model selection and parameter tuning (temperature, max tokens, etc.)
- Custom agent personality configuration via templates and settings

### Real-Time Processing Flow

1. **Session Initialization**: Create a new conversation session when a call is received.
2. **Context Setting**: Send the agent’s personality and prompt context as initial messages.
3. **Audio Processing**: Stream incoming audio from Twilio to transcription (using Whisper or equivalent).
4. **Response Generation**: Query the OpenAI Chat API with the transcript.
5. **TTS Conversion**: Convert text responses to speech for the caller.

*See the [Voice Service](#voice-service) section for detailed integration code.*

## Twilio Integration

The Twilio integration handles all telephony aspects.

### Phone Number Management

- Provisioning and assignment of phone numbers to agents
- Configuration of webhooks for incoming calls
- Active number status tracking

### Call Processing Flow

1. **Call Reception**: Twilio sends a webhook upon receiving a call.
2. **TwiML Generation**: The server responds with TwiML instructions including a media stream.
3. **Media Streaming**: Audio data is streamed to a WebSocket server.
4. **Response Streaming**: AI-generated responses are processed and streamed back.

*Refer to the [Voice Service](#voice-service) code for the realtime streaming example.*

## WebSocket Implementation

The application implements WebSocket communication for realtime features.

### Call Streaming Example

#### Client-Side WebSocket Hook (React)

```js
// client/src/lib/useVoiceStream.js
import { useEffect, useRef } from 'react';

export function useVoiceStream(url, onMessage) {
  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => console.log('WebSocket connected');
    wsRef.current.onmessage = (event) => {
      onMessage(JSON.parse(event.data));
    };
    wsRef.current.onerror = (error) => console.error('WebSocket error:', error);

    return () => {
      wsRef.current.close();
    };
  }, [url, onMessage]);

  return wsRef.current;
}
```

### Server-Side WebSocket

See the [WebSocket Server](#voice-service) snippet in the Voice Service section.

## Getting Started

### Prerequisites

- Node.js v16+
- NPM v7+

### Installation

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Set up environment variables (see below).
4. Start the development server with `npm run dev`.

### Development Workflow

The application uses a Replit workflow that runs `npm run dev` to start:
- Express backend server.
- Vite development server for the frontend.
- WebSocket server for realtime communication.

## Environment Variables

The application requires the following environment variables:

```
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Session Configuration 
SESSION_SECRET=your_session_secret

# Optional database connection (if not using in-memory storage)
DATABASE_URL=your_database_connection_string
```

These can be set through the Replit Secrets management or a `.env` file for local development.

## API Endpoints

The API follows RESTful conventions with a base path of `/api/v1`:

### Authentication
- `POST /api/v1/auth/login`: User login
- `POST /api/v1/auth/register`: User registration
- `POST /api/v1/auth/logout`: User logout
- `GET /api/v1/auth/session`: Get current session info

### Dashboard
- `GET /api/v1/dashboard/stats`: Get system statistics
- `GET /api/v1/dashboard/active-calls`: Get currently active calls
- `GET /api/v1/dashboard/recent-activity`: Get recent system activity

### Agents
- `GET /api/v1/agents`: List all agents
- `GET /api/v1/agents/:id`: Get agent by ID
- `POST /api/v1/agents`: Create a new agent
- `PATCH /api/v1/agents/:id`: Update an agent
- `DELETE /api/v1/agents/:id`: Delete an agent

### Phone Numbers
- `GET /api/v1/phone-numbers`: List all phone numbers
- `GET /api/v1/phone-numbers/:id`: Get phone number by ID
- `GET /api/v1/agents/:agentId/phone-numbers`: Get phone numbers for an agent
- `POST /api/v1/phone-numbers`: Create a new phone number
- `PATCH /api/v1/phone-numbers/:id`: Update a phone number
- `DELETE /api/v1/phone-numbers/:id`: Delete a phone number

### Templates
- `GET /api/v1/templates`: List all templates
- `GET /api/v1/templates/:id`: Get template by ID
- `GET /api/v1/agents/:agentId/templates`: Get templates for an agent
- `POST /api/v1/templates`: Create a new template
- `PATCH /api/v1/templates/:id`: Update a template
- `DELETE /api/v1/templates/:id`: Delete a template

### Call Logs
- `GET /api/v1/call-logs`: List all call logs
- `POST /api/v1/call-logs`: Create a new call log
- `PATCH /api/v1/call-logs/:id`: Update a call log

### Settings
- `GET /api/v1/settings`: Get all settings
- `POST /api/v1/settings`: Update settings

---

This revision integrates realtime voice streaming between Twilio and OpenAI using up-to-date APIs and coding practices. Adjust endpoint URLs, authentication, and audio processing details to fit your deployment environment and project requirements.