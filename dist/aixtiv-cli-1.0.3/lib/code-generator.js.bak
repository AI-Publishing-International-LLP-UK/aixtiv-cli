/**
 * Aixtiv CLI Code Generator
 * 
 * An enhanced code generator that provides template-based code generation
 * for different languages and common programming tasks with built-in error
 * handling and logging.
 */

const fs = require('fs');
const path = require('path');
const { debugDisplay } = require('./debug-display');
const telemetry = require('./telemetry');
const logger = require('./code-generator-logger');

// Templates for different languages and tasks
const CODE_TEMPLATES = {
  javascript: {
    function: `/**
 * {{description}}
 * {{params}}
 * @returns {{returnType}} {{returnDescription}}
 */
function {{functionName}}({{parameters}}) {
  // TODO: Implement the function logic
  {{functionBody}}
}

// Example usage
{{exampleUsage}}
`,
    class: `/**
 * {{description}}
 */
class {{className}} {
  /**
   * Create a new {{className}}
   * {{constructorParams}}
   */
  constructor({{constructorParameters}}) {
    {{constructorBody}}
  }
  
  /**
   * {{methodDescription}}
   * {{methodParams}}
   * @returns {{methodReturnType}} {{methodReturnDescription}}
   */
  {{methodName}}({{methodParameters}}) {
    // TODO: Implement the method logic
    {{methodBody}}
  }
}

// Example usage
{{exampleUsage}}
`,
    api: `/**
 * {{description}}
 */
const express = require('express');
const router = express.Router();

/**
 * {{routeDescription}}
 * @route {{httpMethod}} {{route}}
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.{{httpMethodLower}}('{{routePath}}', async (req, res) => {
  try {
    // TODO: Implement the route handler logic
    {{routeHandlerBody}}
    
    res.status(200).json({ 
      success: true,
      message: 'Operation successful',
      data: {}
    });
  } catch (error) {
    console.error('Error in {{routePath}}:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

module.exports = router;
`
  },
  python: {
    function: `def {{functionName}}({{parameters}}):
    """
    {{description}}
    
    {{params}}
    
    Returns:
        {{returnType}}: {{returnDescription}}
    """
    # TODO: Implement the function logic
    {{functionBody}}

# Example usage
{{exampleUsage}}
`,
    class: `class {{className}}:
    """
    {{description}}
    """
    
    def __init__(self, {{constructorParameters}}):
        """
        Initialize a new {{className}}
        
        {{constructorParams}}
        """
        {{constructorBody}}
    
    def {{methodName}}(self, {{methodParameters}}):
        """
        {{methodDescription}}
        
        {{methodParams}}
        
        Returns:
            {{methodReturnType}}: {{methodReturnDescription}}
        """
        # TODO: Implement the method logic
        {{methodBody}}

# Example usage
{{exampleUsage}}
`,
    api: `from flask import Flask, request, jsonify, Blueprint

{{routeName}} = Blueprint('{{routeName}}', __name__)

@{{routeName}}.route('{{routePath}}', methods=['{{httpMethod}}'])
def {{functionName}}():
    """
    {{description}}
    
    Route: {{httpMethod}} {{route}}
    """
    try:
        # TODO: Implement the route handler logic
        {{routeHandlerBody}}
        
        return jsonify({
            'success': True,
            'message': 'Operation successful',
            'data': {}
        }), 200
    except Exception as e:
        print(f'Error in {{routePath}}: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500
`
  },
  typescript: {
    function: `/**
 * {{description}}
 * {{params}}
 * @returns {{returnType}} {{returnDescription}}
 */
function {{functionName}}({{parameters}}): {{returnTypeTs}} {
  // TODO: Implement the function logic
  {{functionBody}}
}

// Example usage
{{exampleUsage}}
`,
    class: `/**
 * {{description}}
 */
class {{className}} {
  {{properties}}

  /**
   * Create a new {{className}}
   * {{constructorParams}}
   */
  constructor({{constructorParameters}}) {
    {{constructorBody}}
  }
  
  /**
   * {{methodDescription}}
   * {{methodParams}}
   * @returns {{methodReturnType}} {{methodReturnDescription}}
   */
  {{methodName}}({{methodParameters}}): {{methodReturnTypeTs}} {
    // TODO: Implement the method logic
    {{methodBody}}
  }
}

// Example usage
{{exampleUsage}}
`,
    interface: `/**
 * {{description}}
 */
interface {{interfaceName}} {
  {{properties}}
}

// Example usage
{{exampleUsage}}
`
  }
};

/**
 * Generate code based on language and task description
 * 
 * @param {string} language - Programming language (javascript, python, etc)
 * @param {string} task - Task description
 * @param {object} options - Additional options for code generation
 * @returns {string} Generated code
 * @throws {Error} If code generation fails
 */
function generateCode(language, task, options = {}) {
  const timer = logger.startTimer();
  
  try {
    // Validate inputs
    if (!language) {
      throw new Error('Language parameter is required');
    }
    
    if (!task) {
      throw new Error('Task description is required');
    }
    
    // Record telemetry
    telemetry.recordKnowledgeAccess('code-generator');
    
    // Normalize language
    const normalizedLanguage = language.toLowerCase();
    
    // Log the generation request
    logger.info('Code generation request', { language: normalizedLanguage, task });
    
    // Determine task type from keywords
    let taskType = 'function'; // default type
    let templateData = {};
    
    // Parse task description to determine task type and extract key information
    try {
      if (task.toLowerCase().includes('class')) {
        taskType = 'class';
        templateData = parseClassTask(task, options);
      } else if (task.toLowerCase().includes('api') || 
                task.toLowerCase().includes('endpoint') || 
                task.toLowerCase().includes('route')) {
        taskType = 'api';
        templateData = parseApiTask(task, options);
      } else if (normalizedLanguage === 'typescript' && 
                (task.toLowerCase().includes('interface') || 
                task.toLowerCase().includes('type'))) {
        taskType = 'interface';
        templateData = parseInterfaceTask(task, options);
      } else {
        templateData = parseFunctionTask(task, options);
      }
    } catch (parseError) {
      logger.warn('Error parsing task', { 
        error: parseError.message, 
        language: normalizedLanguage, 
        task 
      });
      
      // Default to basic function template
      templateData = getBasicFunctionTemplate(normalizedLanguage, task);
    }
    
    // Get template for the language and task type
    const templates = CODE_TEMPLATES[normalizedLanguage] || CODE_TEMPLATES.javascript;
    const template = templates[taskType] || templates.function;
    
    // Generate code from template
    const generatedCode = replaceTemplateVariables(template, templateData);
    
    // Log success
    logger.info('Code generation successful', {
      language: normalizedLanguage,
      taskType,
      codeLength: generatedCode.length
    });
    
    // End the timer and return the code
    timer.end({ language: normalizedLanguage, taskType, success: true });
    return generatedCode;
  } catch (error) {
    // Log error and end timer
    logger.error('Code generation failed', { 
      error: error.message, 
      language, 
      task,
      stack: error.stack
    });
    
    timer.end({ success: false, error: error.message });
    
    // Re-throw error for caller to handle
    throw error;
  }
}

/**
 * Provides a basic function template when parsing fails
 * 
 * @param {string} language - Programming language 
 * @param {string} task - Task description
 * @returns {object} Basic template data
 */
function getBasicFunctionTemplate(language, task) {
  const functionName = task
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .substring(0, 20) + 'Function';
  
  return {
    description: task,
    functionName,
    parameters: '',
    params: '',
    returnType: 'any',
    returnTypeTs: 'any',
    returnDescription: 'The result',
    functionBody: '// TODO: Implement based on task requirements\nreturn null;',
    exampleUsage: `// const result = ${functionName}();\n// console.log(result);`
  };
}

/**
 * Parse a function task to extract key information
 * 
 * @param {string} task - Task description
 * @param {object} options - Additional options
 * @returns {object} Template data
 */
function parseFunctionTask(task, options) {
  const words = task.split(' ');
  let functionName = 'myFunction';
  
  // Extract function name if it looks like "create a function called X" or similar patterns
  const functionNameKeywords = ['called', 'named', 'function'];
  for (let i = 0; i < words.length - 1; i++) {
    if (functionNameKeywords.includes(words[i].toLowerCase())) {
      const candidate = words[i + 1].replace(/[^\w]/g, '');
      if (candidate && candidate.length > 0) {
        functionName = candidate.charAt(0).toLowerCase() + candidate.slice(1);
      }
    }
  }
  
  // Determine return type
  let returnType = 'any';
  let returnTypeTs = 'any';
  let returnDescription = 'The result';
  
  if (task.toLowerCase().includes('boolean') || task.toLowerCase().includes('true/false')) {
    returnType = 'boolean';
    returnTypeTs = 'boolean';
    returnDescription = 'True if condition is met, false otherwise';
  } else if (task.toLowerCase().includes('string')) {
    returnType = 'string';
    returnTypeTs = 'string';
    returnDescription = 'The resulting string';
  } else if (task.toLowerCase().includes('number') || task.toLowerCase().includes('calculate')) {
    returnType = 'number';
    returnTypeTs = 'number';
    returnDescription = 'The calculated value';
  } else if (task.toLowerCase().includes('array') || task.toLowerCase().includes('list')) {
    returnType = 'Array';
    returnTypeTs = 'any[]';
    returnDescription = 'The resulting array';
  } else if (task.toLowerCase().includes('object')) {
    returnType = 'Object';
    returnTypeTs = 'Record<string, any>';
    returnDescription = 'The resulting object';
  }
  
  // Determine parameters
  let parameters = '';
  let params = '';
  
  if (task.toLowerCase().includes('parameter') || task.toLowerCase().includes('argument')) {
    parameters = 'param1, param2';
    params = `@param {any} param1 - The first parameter\n * @param {any} param2 - The second parameter`;
  }
  
  // Generate example function body based on return type
  let functionBody = '';
  let exampleUsage = '';
  
  switch (returnType) {
    case 'boolean':
      functionBody = 'return param1 === param2;';
      exampleUsage = `const result = ${functionName}(true, false);\nconsole.log(result); // false`;
      break;
    case 'string':
      functionBody = 'return `Result: ${param1}`;';
      exampleUsage = `const result = ${functionName}("test", "other");\nconsole.log(result); // "Result: test"`;
      break;
    case 'number':
      functionBody = 'return param1 + param2;';
      exampleUsage = `const result = ${functionName}(5, 10);\nconsole.log(result); // 15`;
      break;
    case 'Array':
      functionBody = 'return [param1, param2];';
      exampleUsage = `const result = ${functionName}("a", "b");\nconsole.log(result); // ["a", "b"]`;
      break;
    case 'Object':
      functionBody = 'return { param1, param2 };';
      exampleUsage = `const result = ${functionName}("key", "value");\nconsole.log(result); // { param1: "key", param2: "value" }`;
      break;
    default:
      functionBody = 'return null;';
      exampleUsage = `const result = ${functionName}();\nconsole.log(result);`;
  }
  
  return {
    description: task,
    functionName,
    parameters,
    params,
    returnType,
    returnTypeTs,
    returnDescription,
    functionBody,
    exampleUsage
  };
}

/**
 * Parse a class task to extract key information
 * 
 * @param {string} task - Task description
 * @param {object} options - Additional options
 * @returns {object} Template data
 */
function parseClassTask(task, options) {
  const words = task.split(' ');
  let className = 'MyClass';
  
  // Extract class name if it looks like "create a class called X" or similar patterns
  const classNameKeywords = ['called', 'named', 'class'];
  for (let i = 0; i < words.length - 1; i++) {
    if (classNameKeywords.includes(words[i].toLowerCase())) {
      const candidate = words[i + 1].replace(/[^\w]/g, '');
      if (candidate && candidate.length > 0) {
        className = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }
  
  // Generate example constructor and method
  const constructorParameters = 'param1, param2 = "default"';
  const constructorParams = `@param {any} param1 - The first parameter\n   * @param {string} [param2="default"] - The second parameter (optional)`;
  const constructorBody = 'this.param1 = param1;\n    this.param2 = param2;';
  
  const methodName = 'process';
  const methodParameters = 'data';
  const methodDescription = 'Process the provided data';
  const methodParams = '@param {any} data - The data to process';
  const methodReturnType = 'Object';
  const methodReturnTypeTs = 'Record<string, any>';
  const methodReturnDescription = 'The processed result';
  const methodBody = 'return { \n      processed: true,\n      result: data,\n      processedBy: this.param1\n    };';
  
  const properties = 'private param1: any;\n  private param2: string;';
  
  const exampleUsage = `const instance = new ${className}("processor");\nconst result = instance.${methodName}("some data");\nconsole.log(result);`;
  
  return {
    description: task,
    className,
    constructorParameters,
    constructorParams,
    constructorBody,
    methodName,
    methodParameters,
    methodDescription,
    methodParams,
    methodReturnType,
    methodReturnTypeTs,
    methodReturnDescription,
    methodBody,
    properties,
    exampleUsage
  };
}

/**
 * Parse an API task to extract key information
 * 
 * @param {string} task - Task description
 * @param {object} options - Additional options
 * @returns {object} Template data
 */
function parseApiTask(task, options) {
  // Determine HTTP method based on keywords
  let httpMethod = 'GET';
  if (task.toLowerCase().includes('post') || task.toLowerCase().includes('create')) {
    httpMethod = 'POST';
  } else if (task.toLowerCase().includes('put') || task.toLowerCase().includes('update')) {
    httpMethod = 'PUT';
  } else if (task.toLowerCase().includes('delete') || task.toLowerCase().includes('remove')) {
    httpMethod = 'DELETE';
  }
  
  const httpMethodLower = httpMethod.toLowerCase();
  
  // Determine route path based on keywords
  let routePath = '/api/resource';
  const resourceWords = ['for', 'endpoint', 'api', 'route'];
  const words = task.split(' ');
  
  for (let i = 0; i < words.length - 1; i++) {
    if (resourceWords.includes(words[i].toLowerCase())) {
      const candidate = words[i + 1].replace(/[^\w]/g, '').toLowerCase();
      if (candidate && candidate.length > 0) {
        routePath = `/api/${candidate}`;
      }
    }
  }
  
  const route = routePath;
  const routeDescription = `Handle ${httpMethod} requests to ${routePath}`;
  const routeName = routePath.split('/').filter(Boolean).join('_');
  const functionName = `handle_${httpMethodLower}_${routeName}`;
  
  // Generate example route handler body based on HTTP method
  let routeHandlerBody = '';
  
  switch (httpMethod) {
    case 'GET':
      routeHandlerBody = '// Fetch data from the database\nconst data = { id: 1, name: "Example" };\n    ';
      break;
    case 'POST':
      routeHandlerBody = '// Extract data from request body\nconst { name } = req.body;\n    \n    // Validate request data\nif (!name) {\n      return res.status(400).json({ success: false, message: "Name is required" });\n    }\n    \n    // Create new resource\nconst newResource = { id: Date.now(), name };\n    ';
      break;
    case 'PUT':
      routeHandlerBody = '// Extract data from request\nconst { id } = req.params;\nconst { name } = req.body;\n    \n    // Validate request data\nif (!id || !name) {\n      return res.status(400).json({ success: false, message: "ID and name are required" });\n    }\n    \n    // Update existing resource\nconst updatedResource = { id, name };\n    ';
      break;
    case 'DELETE':
      routeHandlerBody = '// Extract resource ID from request\nconst { id } = req.params;\n    \n    // Validate request data\nif (!id) {\n      return res.status(400).json({ success: false, message: "ID is required" });\n    }\n    \n    // Delete the resource\n    ';
      break;
  }
  
  return {
    description: task,
    httpMethod,
    httpMethodLower,
    route,
    routePath,
    routeDescription,
    routeHandlerBody,
    routeName,
    functionName
  };
}

/**
 * Parse an interface task to extract key information (TypeScript)
 * 
 * @param {string} task - Task description
 * @param {object} options - Additional options
 * @returns {object} Template data
 */
function parseInterfaceTask(task, options) {
  const words = task.split(' ');
  let interfaceName = 'MyInterface';
  
  // Extract interface name if it looks like "create an interface called X" or similar patterns
  const interfaceNameKeywords = ['called', 'named', 'interface'];
  for (let i = 0; i < words.length - 1; i++) {
    if (interfaceNameKeywords.includes(words[i].toLowerCase())) {
      const candidate = words[i + 1].replace(/[^\w]/g, '');
      if (candidate && candidate.length > 0) {
        interfaceName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }
  
  // Generate example properties
  const properties = `id: number;\n  name: string;\n  data?: any; // Optional property`;
  
  const exampleUsage = `// Example implementation\nconst example: ${interfaceName} = {\n  id: 1,\n  name: "Example"\n};\n\nconsole.log(example);`;
  
  return {
    description: task,
    interfaceName,
    properties,
    exampleUsage
  };
}

/**
 * Replace template variables with actual values
 * 
 * @param {string} template - Template string with variables in {{variable}} format
 * @param {object} data - Object with values for template variables
 * @returns {string} Template with variables replaced
 */
function replaceTemplateVariables(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    return data[variable] !== undefined ? data[variable] : match;
  });
}

module.exports = {
  generateCode,
  CODE_TEMPLATES
};