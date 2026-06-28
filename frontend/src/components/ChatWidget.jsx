import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { coachAPI } from '../services/api';
import './ChatWidget.css';

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Add a greeting if empty
      if (messages.length === 0) {
        setMessages([{ role: 'model', content: "Hi there! I'm your Caloriq AI Coach. How can I help you reach your goals today?" }]);
      }
    }
  }, [isOpen, messages]);

  const toggleWidget = () => {
    setIsOpen(!isOpen);
  };

    const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data } = await coachAPI.chat(userMessage, messages);
      setMessages([...newMessages, { role: 'model', content: data.reply }]);

      // If the coach performed a tool action (e.g. logged weight, changed targets),
      // broadcast a custom event so other pages can re-fetch their data immediately.
      if (data.data_changed && data.data_changed.length > 0) {
        window.dispatchEvent(
          new CustomEvent('caloriq:data-changed', { detail: { changed: data.data_changed } })
        );
      }
    } catch (error) {
      console.error("Coach API Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: "Listen up! My connection just dropped. Check your network and try again, no excuses!"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-widget-container">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Coach Grit</h3>
            <button className="close-btn" onClick={toggleWidget} aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path>
              </svg>
            </button>
          </div>
          
          <div className="chat-body">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className={`message-content ${msg.role === 'model' ? 'markdown-content' : ''}`}>
                  {msg.role === 'model' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message model">
                <div className="message-content typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-footer" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="Ask about your diet..." 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={!inputMessage.trim() || isLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12L2.01 3L2 10l15 2-15 2z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button className="chat-fab" onClick={toggleWidget} aria-label="Open AI Coach">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 10h2v4H2v-4zM20 10h2v4h-2v-4zM6 5h3v14H6V5zM15 5h3v14h-3V5zM9 11h6v2H9v-2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ChatWidget;
