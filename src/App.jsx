import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/router'
import { AppProviders } from './app/providers'

function App() {
  return (
    // View root: wires global providers and routing for the admin dashboard UI
    <BrowserRouter basename="/dashboard">
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  )
}

export default App
