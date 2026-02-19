import { Dashboard } from './app/components/Dashboard'
import { MarketDataProvider } from './app/components/MarketDataWrapper'

export default function App() {
  return (
    <MarketDataProvider>
      <Dashboard />
    </MarketDataProvider>
  )
}
