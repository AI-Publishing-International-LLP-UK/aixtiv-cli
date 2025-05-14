import React, { createContext, useState, useEffect, useContext } from 'react';
import { universalDispatcherService, resourceService } from '../services/api';
import { AuthContext } from './AuthContext';
import { AgentContext } from './AgentContext';
import { TelemetryContext } from './TelemetryContext';

export const ResourceContext = createContext();

export const ResourceProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const { agent } = useContext(AgentContext);
  const { recordInteraction } = useContext(TelemetryContext);
  
  const [resources, setResources] = useState([]);
  const [todos, setTodos] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load resources and todos when user authenticated
  useEffect(() => {
    const loadResourcesAndTodos = async () => {
      if (isAuthenticated && user) {
        await Promise.all([
          loadResources(),
          loadTodos()
        ]);
      }
    };

    loadResourcesAndTodos();
    
    // Set up polling for todos (every 30 seconds)
    const intervalId = setInterval(() => {
      if (isAuthenticated && user) {
        loadTodos();
      }
    }, 30000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [isAuthenticated, user, agent]);

  // Load resources from API
  const loadResources = async () => {
    try {
      setLoading(true);
      
      const response = await resourceService.getResources(user.id);
      
      if (response.success) {
        setResources(response.resources || []);
      } else {
        throw new Error(response.message || 'Failed to load resources');
      }
    } catch (err) {
      console.error('Error loading resources:', err);
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  // Load todos from Universal Dispatcher
  const loadTodos = async () => {
    try {
      setLoading(true);
      
      const response = await universalDispatcherService.getTasks(
        user?.id || 'pr@coaching2100.com',
        agent.id
      );
      
      if (response.success) {
        const formattedTodos = (response.tasks || []).map(task => ({
          id: task.id,
          content: task.content,
          status: task.status,
          priority: task.priority,
          agentId: task.agentId,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt)
        }));
        
        setTodos(formattedTodos);
        
        // Generate insights based on todos
        generateInsightsFromTodos(formattedTodos);
      } else {
        throw new Error(response.message || 'Failed to load todos');
      }
    } catch (err) {
      console.error('Error loading todos:', err);
      setError('Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

  // Update a todo task status
  const updateTodoStatus = async (todoId, newStatus) => {
    try {
      setLoading(true);
      
      const response = await universalDispatcherService.updateTask(
        todoId,
        newStatus,
        user?.id || 'pr@coaching2100.com'
      );
      
      if (response.success) {
        // Update local state
        setTodos(prev => prev.map(todo => 
          todo.id === todoId 
            ? { ...todo, status: newStatus, updatedAt: new Date() } 
            : todo
        ));
        
        // Record the interaction
        recordInteraction('todo_status_update', {
          todoId,
          previousStatus: todos.find(t => t.id === todoId)?.status,
          newStatus
        });
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to update todo');
      }
    } catch (err) {
      console.error('Error updating todo:', err);
      setError('Failed to update todo');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Create a new todo
  const createTodo = async (content, priority = 'medium') => {
    try {
      setLoading(true);
      
      // Create a new todo using agent service
      // This is a placeholder since we don't have a direct API for this
      // in the current implementation
      const newTodo = {
        content,
        priority,
        status: 'pending',
        agentId: agent.id,
        id: `todo-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add to local state
      setTodos(prev => [...prev, newTodo]);
      
      // Record the interaction
      recordInteraction('todo_created', {
        todoId: newTodo.id,
        content,
        priority
      });
      
      return newTodo;
    } catch (err) {
      console.error('Error creating todo:', err);
      setError('Failed to create todo');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Generate insights from todos
  const generateInsightsFromTodos = (todoList) => {
    // This is a placeholder for actual insight generation
    // In a real implementation, this could call an AI endpoint
    
    // Simple insights based on todo completion
    const completedCount = todoList.filter(t => t.status === 'completed').length;
    const pendingCount = todoList.filter(t => t.status === 'pending').length;
    const inProgressCount = todoList.filter(t => t.status === 'in_progress').length;
    
    // Generate completion rate
    const completionRate = todoList.length > 0 
      ? Math.round((completedCount / todoList.length) * 100) 
      : 0;
    
    // Generate trend (improving, steady, declining)
    const trend = getTodoTrend(todoList);
    
    // Set insights
    setInsights([
      {
        id: 'completion-rate',
        title: 'Task Completion Rate',
        value: `${completionRate}%`,
        trend,
        type: 'percentage'
      },
      {
        id: 'task-distribution',
        title: 'Task Distribution',
        value: `${completedCount} completed, ${inProgressCount} in progress, ${pendingCount} pending`,
        type: 'text'
      }
    ]);
  };

  // Analyze todo trend
  const getTodoTrend = (todoList) => {
    // Sort by update time
    const sortedTodos = [...todoList].sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    
    // Check the 5 most recent todos
    const recentTodos = sortedTodos.slice(0, 5);
    
    // Count completed
    const recentCompletedCount = recentTodos.filter(t => 
      t.status === 'completed'
    ).length;
    
    // Determine trend
    if (recentCompletedCount >= 3) return 'improving';
    if (recentCompletedCount <= 1) return 'declining';
    return 'steady';
  };

  // Value to be provided to consumers
  const value = {
    resources,
    todos,
    insights,
    loading,
    error,
    updateTodoStatus,
    createTodo,
    refreshTodos: loadTodos,
    refreshResources: loadResources
  };

  return (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  );
};