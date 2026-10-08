import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ConfirmHost from './components/ConfirmHost';
import { ThemeProvider } from './context/ThemeContext';
import { TextSizeProvider } from './context/TextSizeContext';
import { PaletteProvider } from './context/PaletteContext';
import './styles/fonts.css';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <PaletteProvider>
        <TextSizeProvider>
          <App />
          <ConfirmHost />
        </TextSizeProvider>
      </PaletteProvider>
    </ThemeProvider>
  </React.StrictMode>
);
