const { firestore, admin } = require('../../../lib/firestore');
const { displayResult, withSpinner, parseOptions } = require('../../../lib/utils');
const { logAgentAction } = require('../../../lib/agent-tracking');
const chalk = require('chalk');
const { table } = require('table');

/**
 * Generates performance reports by squadron or agent
 * Provides metrics and analysis of agent performance data
 */
module.exports = async function generatePerformanceReport(options) {
  const { 
    squadron,
    agent,
    period = '7d',
    format = 'table' 
  } = parseOptions(options);
  
  // Validate required parameters
  if (!squadron && !agent) {
    displayResult('Error: Either squadron ID (--squadron) or agent ID (--agent) is required', 'error');
    return;
  }
  
  try {
    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        // Try to parse as number of days
        const days = parseInt(period);
        if (!isNaN(days) && days > 0) {
          startDate.setDate(startDate.getDate() - days);
        } else {
          displayResult(`Error: Invalid period format. Use 24h, 7d, 30d, 90d or number of days`, 'error');
          return;
        }
    }
    
    // Convert dates to timestamps for Firestore query
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    
    // Build and execute query
    const result = await withSpinner(
      `Generating performance report for ${squadron ? 'squadron ' + squadron : 'agent ' + agent}`,
      async () => {
        let query = firestore.collection('agentPerformance')
          .where('timestamp', '>=', startTimestamp);
          
        // Add squadron or agent filter
        if (squadron) {
          query = query.where('squadron', '==', squadron);
        } else if (agent) {
          query = query.where('agent_id', '==', agent);
        }
        
        // Get matching documents
        const snapshot = await query.get();
        
        if (snapshot.empty) {
          return {
            success: false,
            message: `No performance data found for ${squadron ? 'squadron ' + squadron : 'agent ' + agent} in the specified period`
          };
        }
        
        // Process performance data
        const performanceData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            agent_id: data.agent_id,
            squadron: data.squadron,
            metrics: data.metrics || {},
            timestamp: data.timestamp?.toDate() || null
          };
        });
        
        // Calculate aggregate metrics
        const aggregatedData = aggregatePerformanceData(performanceData);
        
        // Log the report generation
        await logAgentAction('serpew_performance_report', {
          type: squadron ? 'squadron_report' : 'agent_report',
          subject: squadron || agent,
          period,
          data_points: performanceData.length
        });
        
        return {
          success: true,
          message: `Generated performance report with ${performanceData.length} data points`,
          performanceData,
          aggregatedData,
          startDate,
          endDate,
          period
        };
      }
    );
    
    if (result && result.success) {
      console.log(chalk.green(`\n✓ Success: Performance Report Generated\n`));
      
      // Report header
      console.log(chalk.bold('Performance Report:'));
      console.log(`Period: ${chalk.cyan(formatDate(result.startDate))} to ${chalk.cyan(formatDate(result.endDate))}`);
      console.log(`Subject: ${squadron ? 'Squadron ' + chalk.cyan(squadron) : 'Agent ' + chalk.cyan(agent)}`);
      console.log(`Data Points: ${chalk.cyan(result.performanceData.length)}`);
      console.log('\n');
      
      // Display aggregated metrics
      const metrics = result.aggregatedData;
      
      if (format === 'table') {
        // Format metrics table
        const tableData = [
          ['Metric', 'Value', 'Change']
        ];
        
        Object.entries(metrics).forEach(([key, value]) => {
          // Skip internal metrics or non-numeric values
          if (key.startsWith('_') || typeof value !== 'number') return;
          
          // Format the change indicator
          const change = metrics[`${key}_change`];
          let changeDisplay = 'N/A';
          
          if (typeof change === 'number') {
            if (change > 0) {
              changeDisplay = chalk.green(`+${change.toFixed(2)}%`);
            } else if (change < 0) {
              changeDisplay = chalk.red(`${change.toFixed(2)}%`);
            } else {
              changeDisplay = chalk.blue('0%');
            }
          }
          
          tableData.push([
            formatMetricName(key),
            formatMetricValue(key, value),
            changeDisplay
          ]);
        });
        
        console.log(table(tableData));
      } else if (format === 'json') {
        console.log(JSON.stringify(metrics, null, 2));
      }
      
      // Team performance breakdown if squadron report
      if (squadron && result.aggregatedData._agents && result.aggregatedData._agents.length > 0) {
        console.log(chalk.bold('\nAgent Performance Breakdown:'));
        
        // Format agent metrics table
        const agentTableData = [
          ['Agent', 'Task Count', 'Success Rate', 'Avg Response Time']
        ];
        
        result.aggregatedData._agents.forEach(agent => {
          agentTableData.push([
            agent.agent_id,
            agent.task_count || 0,
            agent.success_rate ? `${(agent.success_rate * 100).toFixed(1)}%` : 'N/A',
            agent.avg_response_time ? `${agent.avg_response_time.toFixed(2)}ms` : 'N/A'
          ]);
        });
        
        console.log(table(agentTableData));
      }
      
      // Provide guidance for more detailed reports
      console.log(chalk.cyan('\nFor more detailed metrics:'));
      
      if (squadron) {
        console.log(`Run agent-specific report: aixtiv serpew:performance:report --agent <agent_id> --period ${period}`);
      } else {
        console.log(`View JSON format: aixtiv serpew:performance:report --agent ${agent} --period ${period} --format json`);
      }
      
    } else {
      displayResult(`Error: ${result?.message || 'Failed to generate performance report'}`, 'error');
    }
  } catch (error) {
    displayResult(`Error: ${error.message}`, 'error');
  }
};

/**
 * Aggregates performance data into summary metrics
 * @param {Array} data - Raw performance data
 * @returns {Object} Aggregated metrics
 */
function aggregatePerformanceData(data) {
  const metrics = {
    _dataPoints: data.length,
    _agents: [],
    task_count: 0,
    success_count: 0,
    success_rate: 0,
    avg_response_time: 0,
    avg_tokens_used: 0
  };
  
  // Track metrics by agent
  const agentMetrics = {};
  
  // Process each data point
  data.forEach(point => {
    // Skip points without metrics
    if (!point.metrics) return;
    
    // Track agent
    if (!agentMetrics[point.agent_id]) {
      agentMetrics[point.agent_id] = {
        agent_id: point.agent_id,
        task_count: 0,
        success_count: 0,
        response_time_total: 0,
        tokens_total: 0
      };
    }
    
    // Increment task count
    metrics.task_count += (point.metrics.task_count || 0);
    agentMetrics[point.agent_id].task_count += (point.metrics.task_count || 0);
    
    // Increment success count
    metrics.success_count += (point.metrics.success_count || 0);
    agentMetrics[point.agent_id].success_count += (point.metrics.success_count || 0);
    
    // Accumulate response time
    if (point.metrics.response_time) {
      if (!metrics.response_time_total) metrics.response_time_total = 0;
      metrics.response_time_total += point.metrics.response_time;
      agentMetrics[point.agent_id].response_time_total += point.metrics.response_time;
    }
    
    // Accumulate token usage
    if (point.metrics.tokens_used) {
      if (!metrics.tokens_total) metrics.tokens_total = 0;
      metrics.tokens_total += point.metrics.tokens_used;
      agentMetrics[point.agent_id].tokens_total += point.metrics.tokens_used;
    }
  });
  
  // Calculate derived metrics
  if (metrics.task_count > 0) {
    metrics.success_rate = metrics.success_count / metrics.task_count;
  }
  
  if (metrics.response_time_total && metrics.task_count > 0) {
    metrics.avg_response_time = metrics.response_time_total / metrics.task_count;
  }
  
  if (metrics.tokens_total && metrics.task_count > 0) {
    metrics.avg_tokens_used = metrics.tokens_total / metrics.task_count;
  }
  
  // Calculate agent-specific metrics
  Object.values(agentMetrics).forEach(agent => {
    if (agent.task_count > 0) {
      agent.success_rate = agent.success_count / agent.task_count;
    }
    
    if (agent.response_time_total && agent.task_count > 0) {
      agent.avg_response_time = agent.response_time_total / agent.task_count;
    }
    
    if (agent.tokens_total && agent.task_count > 0) {
      agent.avg_tokens_used = agent.tokens_total / agent.task_count;
    }
    
    metrics._agents.push(agent);
  });
  
  // Sort agents by task count (descending)
  metrics._agents.sort((a, b) => b.task_count - a.task_count);
  
  // Calculate change percentages from historical data
  // This should be calculated based on comparison with previous period
  // For now, we'll leave these undefined until we implement historical comparison
  metrics.success_rate_change = undefined;
  metrics.avg_response_time_change = undefined;
  metrics.avg_tokens_used_change = undefined;
  
  return metrics;
}

/**
 * Formats a metric name for display
 * @param {string} name - The raw metric name
 * @returns {string} Formatted metric name
 */
function formatMetricName(name) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Formats a metric value for display
 * @param {string} name - The metric name
 * @param {number|string} value - The metric value
 * @returns {string} Formatted metric value
 */
function formatMetricValue(name, value) {
  if (typeof value !== 'number') {
    return value;
  }
  
  if (name.includes('rate')) {
    return `${(value * 100).toFixed(1)}%`;
  } else if (name.includes('time')) {
    return `${value.toFixed(2)}ms`;
  } else if (name.includes('tokens')) {
    return value.toFixed(0);
  } else {
    return value.toFixed(2);
  }
}

/**
 * Formats a date for display
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}
