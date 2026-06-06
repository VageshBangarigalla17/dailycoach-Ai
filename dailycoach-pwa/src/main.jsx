import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ScheduleProvider } from './contexts/ScheduleContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ScheduleProvider>
        <App />
      </ScheduleProvider>
    </AuthProvider>
  </React.StrictMode>,
)
