import React from 'react';
import { Link, NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <header className="dashboard-header">
      <div className="navbar-inner">
        <Link to="/" className="brand-link">
          <h1 className="cognix-brand">Cognix</h1>
          <p className="cognix-slogan">Learn Faster with AI</p>
        </Link>
        <nav className="main-nav">
          <NavLink to="/dashboard" className="nav-item">
            Dashboard
          </NavLink>
          <NavLink to="/new" className="nav-item">
            New Lecture
          </NavLink>
          <NavLink to="/lectures" className="nav-item">
            My Lectures
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;

