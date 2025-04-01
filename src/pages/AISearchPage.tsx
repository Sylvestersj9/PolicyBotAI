import React, { useState } from 'react';

const AISearchPage = () => {
  const [question, setQuestion] = useState('');
  const [document, setDocument] = useState<File | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question || !document) {
      setError('Please provide both a question and a document.');
      return;
    }

    // Read the document content
    const reader = new FileReader();
    reader.readAsText(document);

    reader.onload = async () => {
      const documentContent = reader.result as string;

      // Send the question and document content to the backend
      try {
        const response = await fetch('http://localhost:5000/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question,
            document: documentContent,
          }),
        });

        const data = await response.json();
        if (data.answer) {
          setAnswer(data.answer);
        } else {
          setAnswer('Sorry, no answer found.');
        }
      } catch (error) {
        setError('An error occurred while processing your request.');
        console.error('Error:', error);
      }
    };
  };

  return (
    <div>
      <h1>AI-Powered Document Search</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="question">Ask your question:</label>
        <input
          type="text"
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
        />
        <br />
        <br />
        <label htmlFor="document">Upload Policy Document:</label>
        <input
          type="file"
          id="document"
          onChange={(e) => setDocument(e.target.files?.[0] || null)}
          required
        />
        <br />
        <br />
        <button type="submit">Submit</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {answer && <div><h2>Answer:</h2><p>{answer}</p></div>}
    </div>
  );
};

export default AISearchPage;
import { Switch, Route } from "wouter"; // You are using 'wouter' for routing
import AISearchPage from "@/pages/ai-search-page";  // Import the AISearchPage

function Router() {
  return (
    <Switch>
      <Route path="/ai-search" component={AISearchPage} /> {/* Add this route */}
      {/* Other routes */}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
