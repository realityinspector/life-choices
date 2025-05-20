import React, { createContext, useContext, useState, useEffect } from 'react';
import { Book, Activity } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface BookContextType {
  books: Book[];
  currentBook: Book | null;
  selectedActivities: Set<number>;
  bookActivities: Map<number, Set<number>>;
  isLoading: boolean;
  error: string | null;
  createBook: (name: string) => Promise<Book>;
  updateBook: (id: number, name: string) => Promise<Book>;
  deleteBook: (id: number) => Promise<void>;
  selectBook: (book: Book | null) => void;
  addActivityToBook: (bookId: number, activityId: number) => Promise<void>;
  removeActivityFromBook: (bookId: number, activityId: number) => Promise<void>;
  toggleActivitySelection: (activityId: number) => void;
  clearSelectedActivities: () => void;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export function useBook() {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error('useBook must be used within a BookProvider');
  }
  return context;
}

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Set<number>>(new Set());
  const [bookActivities, setBookActivities] = useState<Map<number, Set<number>>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load books on mount
  useEffect(() => {
    loadBooks();
  }, []);

  // Load activities for current book when it changes
  useEffect(() => {
    if (currentBook) {
      loadBookActivities(currentBook.id);
    }
  }, [currentBook]);

  const loadBooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest('/api/books');
      const data = await response.json();
      setBooks(data);
    } catch (err) {
      setError('Failed to load books');
      console.error('Error loading books:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookActivities = async (bookId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/api/books/${bookId}`);
      const data = await response.json();
      const activityIds = new Set(data.activities.map((a: Activity) => a.id));
      setBookActivities(prev => new Map(prev).set(bookId, activityIds));
    } catch (err) {
      setError('Failed to load book activities');
      console.error('Error loading book activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createBook = async (name: string): Promise<Book> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest('/api/books', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      const newBook = await response.json();
      setBooks(prev => [...prev, newBook]);
      return newBook;
    } catch (err) {
      setError('Failed to create book');
      console.error('Error creating book:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBook = async (id: number, name: string): Promise<Book> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/api/books/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      const updatedBook = await response.json();
      setBooks(prev => prev.map(book => book.id === id ? updatedBook : book));
      if (currentBook?.id === id) {
        setCurrentBook(updatedBook);
      }
      return updatedBook;
    } catch (err) {
      setError('Failed to update book');
      console.error('Error updating book:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBook = async (id: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await apiRequest(`/api/books/${id}`, {
        method: 'DELETE',
      });
      setBooks(prev => prev.filter(book => book.id !== id));
      if (currentBook?.id === id) {
        setCurrentBook(null);
      }
      setBookActivities(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    } catch (err) {
      setError('Failed to delete book');
      console.error('Error deleting book:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const selectBook = (book: Book | null) => {
    setCurrentBook(book);
    if (book) {
      const bookActivitySet = bookActivities.get(book.id);
      if (bookActivitySet) {
        const activities = new Set(bookActivitySet);
        setSelectedActivities(activities);
        setBookActivities(prev => {
          const newMap = new Map(prev);
          newMap.set(book.id, activities);
          return newMap;
        });
      }
    } else {
      setSelectedActivities(new Set());
    }
  };

  const addActivityToBook = async (bookId: number, activityId: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await apiRequest(`/api/books/${bookId}/activities`, {
        method: 'POST',
        body: JSON.stringify({ activityId }),
      });
      setBookActivities(prev => {
        const newMap = new Map(prev);
        const activities = newMap.get(bookId) || new Set();
        activities.add(activityId);
        newMap.set(bookId, activities);
        return newMap;
      });
    } catch (err) {
      setError('Failed to add activity to book');
      console.error('Error adding activity to book:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeActivityFromBook = async (bookId: number, activityId: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await apiRequest(`/api/books/${bookId}/activities/${activityId}`, {
        method: 'DELETE',
      });
      setBookActivities(prev => {
        const newMap = new Map(prev);
        const activities = newMap.get(bookId);
        if (activities) {
          activities.delete(activityId);
          newMap.set(bookId, activities);
        }
        return newMap;
      });
    } catch (err) {
      setError('Failed to remove activity from book');
      console.error('Error removing activity from book:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActivitySelection = (activityId: number) => {
    setSelectedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const clearSelectedActivities = () => {
    setSelectedActivities(new Set());
  };

  const value = {
    books,
    currentBook,
    selectedActivities,
    bookActivities,
    isLoading,
    error,
    createBook,
    updateBook,
    deleteBook,
    selectBook,
    addActivityToBook,
    removeActivityFromBook,
    toggleActivitySelection,
    clearSelectedActivities,
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
} 