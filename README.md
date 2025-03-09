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





