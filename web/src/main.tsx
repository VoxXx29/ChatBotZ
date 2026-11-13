import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import RiffChat from './components/riff/RiffChat'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><RiffChat /></StrictMode>,
)
