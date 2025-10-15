import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/image.png'; // ✅ adjust the path based on your folder structure

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: 'fas fa-home' },
    { path: '/quiz', label: 'Quiz', icon: 'fas fa-question-circle' },
    { path: '/results', label: 'Results', icon: 'fas fa-chart-bar' },
    { path: '/settings', label: 'Settings', icon: 'fas fa-cog' }
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          
            {/* ✅ Replace the icon with your image */}
            <img src={logo} alt="Logo" className="logo-img" />
        
          <span>QuizMaster</span>
        </Link>

        <ul className="nav-menu">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
