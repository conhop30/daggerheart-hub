import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { TextSizeProvider } from './context/TextSizeContext';
import './styles/fonts.css';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <TextSizeProvider>
        <App />
      </TextSizeProvider>
    </ThemeProvider>
  </React.StrictMode>
);
