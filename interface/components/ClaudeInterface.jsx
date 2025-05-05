import React, { useState, useEffect } from 'react';
import { Input, Button, Card, Badge } from '@/components/ui/';

const ClaudeInterface = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('ready');

  const handleSubmit = async () => {
    setStatus('processing');
    // API call logic here
    setStatus('ready');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="bg-white shadow-xl rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Super Claude Interface</h2>
            <Badge variant={status === 'ready' ? 'success' : 'warning'}>{status}</Badge>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 min-h-96 mb-4">
            {messages.map((msg, i) => (
              <div key={i} className="mb-4">
                <p className="text-gray-700">{msg}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Super Claude..."
              className="flex-1"
            />
            <Button onClick={handleSubmit}>Send</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ClaudeInterface;
