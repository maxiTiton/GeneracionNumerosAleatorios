// src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-blue-600 text-white px-auto py-3 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">TP Simulación Grupo 13</div>
        <ul className="hidden md:flex gap-6">
          <li>
            <Link to="/generacion" className="hover:text-gray-300">
              Generación
            </Link>
          </li>
          <li>
            <Link to="/tests" className="hover:text-gray-300">
              Tests
            </Link>
          </li>
        </ul>
        <div className="md:hidden">
          <button className="text-white">☰</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
