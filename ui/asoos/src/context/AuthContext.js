import React, { createContext, useState, useEffect } from 'react';
import { sallyPortService } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('sallyport_token');
        if (token) {
          // Validate the token with SallyPort
          const response = await sallyPortService.validateToken(token);
          if (response.success) {
            setUser({
              id: response.principal,
              displayName: response.name || 'Mr. Phillip Corey Roark',
              email: response.principal,
              role: response.role || 'CEO'
            });
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('sallyport_token');
          }
        }
      } catch (err) {
        console.error('Auth token validation error:', err);
        setError('Error validating authentication. Please login again.');
        localStorage.removeItem('sallyport_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function using SallyPort authentication
  const login = async (email = 'pr@coaching2100.com') => {
    try {
      setLoading(true);
      setError(null);
      
      // Call SallyPort auth service
      const response = await sallyPortService.authenticate(email);
      
      if (response.success) {
        // Store token in localStorage
        localStorage.setItem('sallyport_token', response.token);
        
        // Set user state
        setUser({
          id: response.principal || email,
          displayName: response.name || 'Mr. Phillip Corey Roark',
          email: email,
          role: response.role || 'CEO'
        });
        
        setIsAuthenticated(true);
        return true;
      } else {
        setError(response.message || 'Authentication failed');
        return false;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Authentication failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      
      // Call SallyPort logout service
      await sallyPortService.logout();
      
      // Clear local storage
      localStorage.removeItem('sallyport_token');
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      return true;
    } catch (err) {
      console.error('Logout error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Value to be provided to consumers
  const contextValue = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};