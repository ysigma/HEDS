import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { client, SigmaClientProvider } from '@sigmacomputing/plugin';
import App from './App';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SigmaClientProvider client={client}>
      <App />
    </SigmaClientProvider>
  </StrictMode>,
);
