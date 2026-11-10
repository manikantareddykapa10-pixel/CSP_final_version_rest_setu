import React from "react";
import Layout from "../../components/shared/Layout/Layout";
import { useSelector } from "react-redux";

const AdminHome = () => {
  const { user } = useSelector((state) => state.auth);
  return (
    <Layout>
      <div className="container-fluid p-4">
        {/* Header Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="bg-gradient bg-primary text-white rounded-3 p-4 shadow-sm">
              <h1 className="mb-2">
                Welcome <span className="fw-bold">{user?.name}</span>
              </h1>
              <h4 className="mb-0">Blood Bridge Blood Bank Management Dashboard</h4>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="row mb-4">
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="text-primary mb-2">
                  <i className="fas fa-users fa-2x"></i>
                </div>
                <h5 className="card-title text-muted">Total Users</h5>
                <h2 className="text-primary">4</h2>
                <small className="text-muted">Active Accounts</small>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="text-danger mb-2">
                  <i className="fas fa-tint fa-2x"></i>
                </div>
                <h5 className="card-title text-muted">Total Donations</h5>
                <h2 className="text-danger">18</h2>
                <small className="text-muted">Units Collected</small>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="text-success mb-2">
                  <i className="fas fa-hospital fa-2x"></i>
                </div>
                <h5 className="card-title text-muted">Blood Distributed</h5>
                <h2 className="text-success">6</h2>
                <small className="text-muted">Units to Hospitals</small>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <div className="text-warning mb-2">
                  <i className="fas fa-warehouse fa-2x"></i>
                </div>
                <h5 className="card-title text-muted">Available Stock</h5>
                <h2 className="text-warning">12</h2>
                <small className="text-muted">Units in Inventory</small>
              </div>
            </div>
          </div>
        </div>

        {/* System Overview */}
        <div className="row">
          <div className="col-lg-8 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0">
                  <i className="fas fa-chart-line me-2 text-info"></i>
                  System Overview
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="text-primary">Active Organizations</h6>
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="fas fa-building me-2 text-danger"></i>
                        <strong>Red Cross Delhi</strong>
                        <span className="badge bg-success ms-2">Active</span>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-primary">Connected Hospitals</h6>
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="fas fa-hospital me-2 text-success"></i>
                        <strong>AIIMS Delhi</strong>
                        <span className="badge bg-info ms-2">Connected</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <h6 className="text-primary">Registered Donors</h6>
                    <ul className="list-unstyled">
                      <li className="mb-1">
                        <i className="fas fa-user me-2 text-danger"></i>
                        John Doe
                      </li>
                      <li className="mb-1">
                        <i className="fas fa-user me-2 text-danger"></i>
                        Prapti Sharma
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-primary">Blood Groups Available</h6>
                    <div className="d-flex flex-wrap">
                      <span className="badge bg-success me-1 mb-1">A+ (4)</span>
                      <span className="badge bg-success me-1 mb-1">B+ (1)</span>
                      <span className="badge bg-success me-1 mb-1">O+ (2)</span>
                      <span className="badge bg-success me-1 mb-1">O- (3)</span>
                      <span className="badge bg-success me-1 mb-1">AB+ (1)</span>
                      <span className="badge bg-success me-1 mb-1">AB- (2)</span>
                      <span className="badge bg-success me-1 mb-1">B- (1)</span>
                      <span className="badge bg-danger me-1 mb-1">A- (0)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0">
                  <i className="fas fa-tasks me-2 text-success"></i>
                  Quick Actions
                </h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <button className="btn btn-outline-primary">
                    <i className="fas fa-users me-2"></i>
                    Manage Donors
                  </button>
                  <button className="btn btn-outline-success">
                    <i className="fas fa-hospital me-2"></i>
                    Manage Hospitals
                  </button>
                  <button className="btn btn-outline-info">
                    <i className="fas fa-building me-2"></i>
                    Manage Organizations
                  </button>
                  <button className="btn btn-outline-warning">
                    <i className="fas fa-chart-bar me-2"></i>
                    View Analytics
                  </button>
                </div>
                
                <hr />
                
                <div className="alert alert-info">
                  <h6 className="alert-heading">
                    <i className="fas fa-info-circle me-2"></i>
                    System Status
                  </h6>
                  <small>
                    All systems operational. Last sync: Just now
                    <br />
                    <strong>Life-saving operations: Active</strong>
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm bg-light">
              <div className="card-body text-center">
                <h5 className="text-primary mb-3">
                  <i className="fas fa-heart me-2 text-danger"></i>
                  Our Mission
                </h5>
                <p className="mb-0 lead">
                  Blood Bridge connects donors, organizations, and hospitals to ensure blood reaches those who need it most. 
                  Every donation saves lives, and every efficient distribution makes a difference. 
                  Together, we're building a network where <strong>no one waits for blood when life depends on it</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminHome;