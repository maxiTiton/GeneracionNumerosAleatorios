// src/App.jsx
import './App.css';
import Navbar from './components/Navbar';
import Histograma from './components/Histograma';
import TestRunner from './components/TestRunner';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="App p-4">
        <Routes>
          <Route path="/" element={<Histograma />} />
          <Route path="/generacion" element={<Histograma />} />
          <Route path="/tests" element={<TestRunner />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
