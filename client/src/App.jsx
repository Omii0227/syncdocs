import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Documents from './pages/Documents'
import Editor from './pages/Editor'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/docs" element={<Documents />} />
      <Route path="/editor/:id" element={<Editor />} />
    </Routes>
  )
}
