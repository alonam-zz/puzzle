import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>  
    <BrowserRouter>
    <Routes>
      <Route element={<Layout />}>   
      <Route path="/" element={<App />} />
      </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
