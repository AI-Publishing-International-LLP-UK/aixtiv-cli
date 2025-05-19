          </div>
          
          <div className="p-4 overflow-auto max-h-48">
            <div className="space-y-3">
              {todos && todos.length > 0 ? (
                todos.map((todo, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm">{todo.content}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm">No current tasks</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Insights Panel */}
        <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50">
            <h3 className="font-bold text-blue-700">Insights</h3>
            <div className="text-gray-500">▶</div>
          </div>
        </div>
        
        {/* Resources */}
        <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50">
            <h3 className="font-bold text-blue-700">Resources</h3>
            <div className="text-gray-500">▶</div>
          </div>
        </div>
      </div>
    </div>
  );
  }
  
  // Login View
  const LoginView: React.FC = () => {
    console.log('Rendering LoginView');
    return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full relative overflow-hidden">
        {/* Hexagon Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <svg className="absolute top-0 right-0 w-96 h-96" viewBox="0 0 100 100">
            <path 
              d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" 

