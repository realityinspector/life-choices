# LIFE CHOICES by ALL ONE THING

![LIFE CHOICES Logo](./generated-icon.png)

## Overview

LIFE CHOICES by ALL ONE THING is a revolutionary timeline management application that helps you visualize and design your future through purposeful choice-making. Built with a fractal approach to time management, the app transforms how you think about daily decisions by showing their interconnected impact on your life's trajectory.

## Features

### 🌟 Fractal Timeline Visualization
- Interactive timeline that shows how choices create ripple effects throughout your life
- Beautiful fractal animation background representing the interconnected nature of decisions
- Present moment focus with clear visualization of choice junctions
- Timeline navigation through past, present, and future perspectives

### 📱 Mobile-First Design
- Touch-friendly interface optimized for mobile devices
- Swipe gestures for intuitive navigation
- Bottom navigation bar for easy access
- Responsive design that works across all screen sizes

### 🎯 Activity Management & Shopping
- Browse and discover life activities through an intuitive shopping interface
- Activity categories including Health, Learning, Career, Relationships, and more
- Smart activity recommendations based on your goals
- Shopping cart functionality for selecting multiple activities
- Activity sharing via shareable links for social onboarding

### 📚 Life Choice Books
- Create custom "books" - collections of related activities
- Organize activities into meaningful clusters (e.g., "Fitness Journey", "Career Growth")
- Generate clean, printable book reports
- Book management with creation, editing, and organization features

### 🔮 "What's Next" Recommendations
- Intelligent algorithm suggests your next activity based on your current routine
- Skip/shuffle functionality for alternative suggestions
- Balanced rotation between different life areas
- Focus on actionable next steps rather than overwhelming planning

### 👤 Profile & Personalization
- User profile management with personal preferences
- Activity tracking and history
- Customizable experience based on your life goals
- Progress tracking across different life areas

### 📊 Analytics & Insights
- Activity completion statistics and trends
- Time allocation visualization
- Pattern recognition for habit formation
- Progress reports and goal achievement tracking

## Technology Stack

### Frontend
- **React with TypeScript** for type-safe, component-based development
- **Tailwind CSS** with ShadCN UI components for modern, responsive design
- **React Query** for efficient data fetching and state management
- **React Hook Form** with Zod validation for robust form handling
- **Canvas API** for fractal timeline animations

### Backend
- **Express.js** server with TypeScript
- **PostgreSQL** database with Drizzle ORM
- **RESTful API** architecture with secure authentication
- **Session-based authentication** with Passport.js
- **File upload handling** for activity images

### Data Management
- **Activity recipes** system for smart activity suggestions
- **Book management** for organizing activity collections
- **Image generation** capabilities for activity visualization
- **CSV import/export** functionality for data management

## Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- PostgreSQL database

### Installation

1. Clone the repository
   ```bash
   git clone <your-repository-url>
   cd life-choices-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables (create a `.env` file in the project root)
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/lifechoices
   ```

4. Run database migrations
   ```bash
   npm run db:push
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5000`

## Usage Guide

### Getting Started
1. Create a new account or sign in
2. Complete your profile setup
3. Explore the landing page to understand the fractal timeline concept
4. Browse available activities in the Shop Activities section

### Managing Activities
1. **Browse Activities**: Navigate to Shop Activities to discover new life choices
2. **Add to Cart**: Select activities that align with your goals
3. **Create Books**: Organize related activities into themed collections
4. **Track Progress**: Monitor your activity completion and patterns

### Timeline Navigation
- **Present Moment**: Focus on current choice junctions and immediate next steps
- **Past View**: Reflect on previous decisions and their outcomes
- **Future Projection**: Visualize how current choices will impact your future
- **What's Next**: Get intelligent recommendations for your next activity

### Book Management
1. Navigate to the Book section
2. Create new books for different life areas
3. Add activities from your collection to relevant books
4. Generate book reports for planning and reflection

### Social Features
- Share activities with friends via generated links
- Onboard new users through shared activity experiences
- Collaborate on life choice journeys

## Core Philosophy

### Fractal Time Management
LIFE CHOICES operates on the principle that small decisions create profound ripple effects throughout your life. Like fractals in nature, your choices branch and interconnect, forming the unique pattern of your existence.

### Choice-Centric Design
Rather than focusing on time scarcity or life expectancy, the app emphasizes the power of conscious choice-making in the present moment. Every choice is a junction point that shapes your future timeline.

### Purpose-Driven Living
The application helps you align daily activities with deeper life purposes, ensuring that your choices contribute to meaningful growth and fulfillment.

## Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run db:push` - Push database schema changes

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared TypeScript types and schemas
├── scripts/         # Database and utility scripts
├── uploads/         # File upload storage
└── backups/         # Database backup files
```

## Contributing

We welcome contributions! Please feel free to submit a Pull Request. Make sure to:

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation as needed
4. Test across different screen sizes and devices

## Deployment

This application is designed to run on Replit's platform. The included configuration files (`.replit`, `replit.nix`) provide the necessary setup for seamless deployment.

## License

This project is licensed under the MIT License.

## Acknowledgments

- The fractal mathematics community for inspiration on interconnected systems
- React and TypeScript ecosystems for powerful development tools
- ALL ONE THING philosophy for the holistic approach to life design
- The open source community for continuous innovation

---

*"Shape your timeline, design your future. Make every choice count."*