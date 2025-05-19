# Make a Book Feature Implementation Plan

## Overview
The "Make a Book" feature allows users to create curated collections of activities in a book format. Users can browse activities, add them to books, and view them in a simplified book layout.

## Database Schema Changes

### New Tables

1. `books` table:
```sql
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

2. `book_activities` junction table:
```sql
CREATE TABLE book_activities (
  id SERIAL PRIMARY KEY,
  bookId INTEGER REFERENCES books(id) ON DELETE CASCADE,
  activityId INTEGER REFERENCES activities(id) ON DELETE CASCADE,
  orderIndex INTEGER NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(bookId, activityId)
);
```

## API Endpoints

### Books Management
- `GET /api/books` - Get all books for current user
- `POST /api/books` - Create a new book
- `PUT /api/books/:id` - Update book details
- `DELETE /api/books/:id` - Delete a book
- `GET /api/books/:id` - Get book details with activities

### Book Activities Management
- `POST /api/books/:id/activities` - Add activity to book
- `DELETE /api/books/:id/activities/:activityId` - Remove activity from book
- `PUT /api/books/:id/activities/order` - Update activity order in book

## Frontend Components

### 1. Book Creation/Management Page (`/book`)
- Grid layout with small activity thumbnails (4+ per row)
- Activity selection states:
  - Not added (default)
  - Added to current book (green highlight)
  - Selected to be added (blue highlight)
- Book management panel:
  - Create new book
  - Select existing book
  - Edit book name
  - Delete book
- Activity filtering and sorting options
- Search functionality

### 2. Book Report Page (`/book-report`)
- Book selector dropdown
- Simplified book layout showing:
  - Activity name
  - Activity image
  - Clean, minimal design
- Responsive grid layout
- Print-friendly styling

## Implementation Steps

1. **Database Setup**
   - Create new tables
   - Add indexes for performance
   - Update schema types

2. **Backend Implementation**
   - Create book routes
   - Implement CRUD operations
   - Add activity management endpoints
   - Add validation and error handling

3. **Frontend Implementation**
   - Create new pages:
     - `/book` for book creation
     - `/book-report` for viewing
   - Implement activity grid component
   - Add book management UI
   - Create book report viewer
   - Add to bottom navigation

4. **State Management**
   - Add book context
   - Implement book selection state
   - Handle activity selection states
   - Manage book-activity relationships

5. **UI/UX Features**
   - Activity thumbnail grid
   - Selection highlighting
   - Book management interface
   - Book report layout
   - Responsive design
   - Loading states
   - Error handling

## Technical Details

### Activity Grid Component
```typescript
interface ActivityGridProps {
  activities: Activity[];
  selectedBook: Book | null;
  onActivitySelect: (activity: Activity) => void;
  onActivityDeselect: (activity: Activity) => void;
  selectedActivities: Set<number>;
  bookActivities: Set<number>;
}
```

### Book Management
```typescript
interface Book {
  id: number;
  name: string;
  description?: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BookActivity {
  id: number;
  bookId: number;
  activityId: number;
  orderIndex: number;
  createdAt: Date;
}
```

### State Management
```typescript
interface BookState {
  books: Book[];
  currentBook: Book | null;
  selectedActivities: Set<number>;
  bookActivities: Map<number, Set<number>>; // bookId -> Set of activityIds
}
```

## UI/UX Guidelines

### Activity Grid
- Minimum 4 activities per row
- Small thumbnails (120x120px)
- Clear selection states:
  - Default: White background
  - Selected: Blue highlight
  - In book: Green highlight
- Hover effects for better interaction
- Quick add/remove actions

### Book Management
- Clean, minimal interface
- Easy book creation/editing
- Clear activity selection feedback
- Drag-and-drop reordering (optional)

### Book Report
- Print-friendly layout
- Large activity images
- Minimal text (name only)
- Responsive grid
- Clean typography

## Testing Plan

1. **Unit Tests**
   - Book CRUD operations
   - Activity selection logic
   - State management
   - Component rendering

2. **Integration Tests**
   - Book creation flow
   - Activity selection
   - Book report generation

3. **UI Tests**
   - Grid layout
   - Selection states
   - Responsive design
   - Print layout

## Performance Considerations

1. **Image Optimization**
   - Thumbnail generation
   - Lazy loading
   - Caching

2. **Data Loading**
   - Pagination for large activity sets
   - Efficient book-activity relationships
   - Optimized queries

3. **State Management**
   - Efficient selection tracking
   - Minimal re-renders
   - Optimized updates

## Security Considerations

1. **Access Control**
   - User-specific books
   - Activity access validation
   - API endpoint protection

2. **Data Validation**
   - Input sanitization
   - Book name validation
   - Activity selection limits

## Future Enhancements

1. **Book Templates**
   - Pre-made book collections
   - Category-based templates

2. **Sharing**
   - Share books with other users
   - Export as PDF
   - Social sharing

3. **Advanced Features**
   - Book categories
   - Activity notes in books
   - Custom layouts
   - Book covers 