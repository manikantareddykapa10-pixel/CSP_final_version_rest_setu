import React from "react";
// import { userMenu } from './Menus/userMenu'
import { Link, useLocation } from "react-router-dom";
import "../../../styles/Layout.css";
import { useSelector } from "react-redux";

const Sidebar = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  return (
    <div>
      <div className="sidebar">
        <div className="menu">
          {user?.role === "organisation" && (
            <>
              <div
                className={`menu-item ${location.pathname === "/" && "active"}`}
              >
                <i className="fa-solid fa-cubes"></i>
                <Link to="/">Inventory</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/donar" && "active"
                }`}
              >
                <i className="fa-solid fa-hand-holding-medical"></i>
                <Link to="/donar">Donars</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/hospital" && "active"
                }`}
              >
                <i className="fa-solid fa-truck-medical"></i>
                <Link to="/hospital">Hospitals</Link>
              </div>
            </>
          )}
          
          {user?.role === "admin" && (
            <>
              <div
                className={`menu-item ${
                  location.pathname === "/donar-list" && "active"
                }`}
              >
                <i className="fa-solid fa-hand-holding-medical"></i>
                <Link to="/donar-list">Donar List</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/hospital-list" && "active"
                }`}
              >
                <i className="fa-solid fa-truck-medical"></i>
                <Link to="/hospital-list">Hospital List</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/org-list" && "active"
                }`}
              >
                <i className="fa-solid fa-hospital"></i>
                <Link to="/org-list">Organisation List</Link>
              </div>
            </>
          )}

          {user?.role === "donar" && (
            <>
              <div
                className={`menu-item ${
                  location.pathname === "/donar" && "active"
                }`}
              >
                <i className="fa-solid fa-house-medical"></i>
                <Link to="/donar">Dashboard</Link>
              </div>
              <div
                className={`menu-item ${
                  location.pathname === "/eligibility-score" && "active"
                }`}
              >
                <i className="fa-solid fa-heart-pulse"></i>
                <Link to="/eligibility-score">My Eligibility Score</Link>
              </div>
            </>
          )}

          {user?.role === "hospital" && (
            <div
              className={`menu-item ${
                location.pathname === "/hospital" && "active"
              }`}
            >
              <i className="fa-solid fa-hospital-user"></i>
              <Link to="/hospital">My Hospital Profile</Link>
            </div>
          )}

          {/* Blood Map - visible to all roles */}
          <div className={`menu-item ${location.pathname === "/blood-map" && "active"}`}>
            <i className="fa-solid fa-map-location-dot"></i>
            <Link to="/blood-map">Blood Map</Link>
          </div>

          {/* Request Blood - visible to organisation and hospital only */}
          {(user?.role === "organisation" || user?.role === "hospital") && (
            <div className={`menu-item ${location.pathname === "/request-blood" && "active"}`}>
              <i className="fa-solid fa-droplet-slash"></i>
              <Link to="/request-blood">Request Blood</Link>
            </div>
          )}

          {/* Analytics */}
          {(user?.role === "organisation" || user?.role === "hospital") && (
            <div className={`menu-item ${location.pathname === "/analytics" && "active"}`}>
              <i className="fa-solid fa-chart-bar"></i>
              <Link to="/analytics">Analytics</Link>
            </div>
          )}
        </div>
        {user?.role === "hospital" && (
          <Link
            to="/hospital"
            className="sidebar-hospital-profile"
            aria-label="View hospital profile"
          >
            {user.profilePicture ? (
            <img src={user.profilePicture} alt={user.hospitalName || "Hospital"} />
            ) : (
            <span className="sidebar-hospital-profile-placeholder" aria-hidden="true">
              <i className="fa-solid fa-hospital"></i>
            </span>
            )}
            <span className="sidebar-hospital-profile-name">
            {user.hospitalName || "Hospital profile"}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
