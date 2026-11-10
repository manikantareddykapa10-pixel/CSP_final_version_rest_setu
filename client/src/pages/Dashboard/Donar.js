import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Layout from '../../components/shared/Layout/Layout';
import API from '../../services/API';
import moment from 'moment';
import toast from 'react-hot-toast';
import { ProgressBar } from 'react-loader-spinner';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { updateCurrentUser } from '../../redux/features/auth/authSlice';

const parsePatientDocuments = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────
// Organisation view — list of donors who donated through this org
// ─────────────────────────────────────────────
const OrgDonorList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/inventory/get-donars')
      .then(({ data }) => { if (data?.success) setData(data.donars); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <ProgressBar visible height="120" width="120" color="#d32f2f" ariaLabel="loading" />
    </div>
  );

  return (
    <div className="container mt-4">
      <h5 className="mb-3">
        <i className="fa-solid fa-hand-holding-medical me-2 text-danger"></i>
        Donors who donated through your organisation
      </h5>
      <table className="table table-bordered">
        <thead className="table-active">
          <tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={4} className="text-center text-muted py-3">
              No donors yet — add inventory (IN) with a donor's email to see them here
            </td></tr>
          ) : data.map(record => (
            <tr key={record._id}>
              <td>{record.name || `${record.organisationName} (ORG)`}</td>
              <td>{record.email}</td>
              <td>{record.phone}</td>
              <td>{moment(record.createdAt).format('DD/MM/YYYY hh:mm A')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────
// Donor view — blood requests + set location
// ─────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    pending:   { bg: '#fff3e0', color: '#e65100', label: '⏳ Pending' },
    accepted:  { bg: '#e8f5e9', color: '#2e7d32', label: '✅ Accepted' },
    completed: { bg: '#e3f2fd', color: '#1565c0', label: '🎉 Completed' },
    cancelled: { bg: '#f5f5f5', color: '#757575', label: '✖ Cancelled' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>
      {s.label}
    </span>
  );
};

const MapLocationPicker = ({ position, onSelect }) => {
  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return position ? (
    <CircleMarker center={[position.lat, position.lng]} radius={9}
      pathOptions={{ color: '#fff', fillColor: '#d32f2f', fillOpacity: 1 }} />
  ) : null;
};

const DonorView = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const [donationHistory, setDonationHistory] = useState([]);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [accepting, setAccepting] = useState(null);
  const [revealedContacts, setRevealedContacts] = useState({});
  const [profilePicture, setProfilePicture] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profileSettings, setProfileSettings] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    bloodGroup: '',
    isAvailable: true,
  });
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (user?.profilePicture) setProfilePicture(user.profilePicture);
    if (user?.location) setSelectedLocation(user.location);
    setProfileSettings({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      bloodGroup: user?.bloodGroup || '',
      isAvailable: user?.isAvailable !== false,
    });
  }, [user]);

  const fetchAvailableRequests = useCallback(async () => {
    try {
      const { data } = await API.get('/requests/available');
      if (data?.success) {
        if (prevCountRef.current > 0 && data.requests.length > prevCountRef.current) {
          toast('🔔 New blood request in your area!', { duration: 5000 });
        }
        prevCountRef.current = data.requests.length;
        setAvailableRequests(data.requests);
      }
    } catch (err) { console.error(err); }
  }, []);

  const fetchMyAccepted = useCallback(async () => {
    try {
      const { data } = await API.get('/requests/mine');
      if (data?.success) setMyRequests(data.requests.filter(r => r.acceptedBy && r.status !== 'cancelled'));
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await API.get('/inventory/get-donars');
        if (data?.success) setDonationHistory(data.donars);
      } catch (err) { console.error(err); }
      await Promise.all([fetchAvailableRequests(), fetchMyAccepted()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(() => { fetchAvailableRequests(); fetchMyAccepted(); }, 8000);
    return () => clearInterval(interval);
  }, [fetchAvailableRequests, fetchMyAccepted]);

  const setMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await API.patch('/auth/update-location', {
            lat: pos.coords.latitude, lng: pos.coords.longitude
          });
          if (data?.success) {
            setSelectedLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            dispatch(updateCurrentUser({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }));
            toast.success('GPS location saved as your donor location.');
          }
          else toast.error(data?.message || 'Could not update location');
        } catch (err) {
          toast.error(err?.response?.data?.message || 'Error updating location');
        }
        setGeoLoading(false);
      },
      () => { toast.error('Location access denied. Please allow location in browser settings.'); setGeoLoading(false); }
    );
  };

  const selectProfilePicture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Profile picture must be smaller than 2 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfilePicture(reader.result);
    reader.readAsDataURL(file);
  };

  const saveProfileLocation = async () => {
    if (!selectedLocation) {
      toast.error('Choose your location on the map first.');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await API.patch('/auth/update-profile', {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        profilePicture,
      });
      if (data?.success) {
        toast.success('Location saved as your donor location. Nearby matching is now active.');
        setSelectedLocation({ lat: selectedLocation.lat, lng: selectedLocation.lng });
        dispatch(updateCurrentUser({
          profilePicture,
          location: { lat: selectedLocation.lat, lng: selectedLocation.lng },
        }));
        setShowMap(false);
      }
      else toast.error(data?.message || 'Could not save profile.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save profile.');
    }
    setSavingProfile(false);
  };

  const saveProfileSettings = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await API.patch('/auth/update-profile', {
        ...profileSettings,
        profilePicture,
      });
      if (data?.success) {
        dispatch(updateCurrentUser(data.user));
        toast.success('Profile settings saved.');
        setShowSettings(false);
      } else {
        toast.error(data?.message || 'Could not save profile settings.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save profile settings.');
    }
    setSavingProfile(false);
  };

  const acceptRequest = async (reqId) => {
    setAccepting(reqId);
    try {
      const { data } = await API.patch(`/requests/${reqId}/accept`);
      if (data?.success) {
        const rc = data.requesterContact;
        const name = rc.name || rc.hospitalName || rc.organisationName || '';
        toast.success(`Accepted! Contact: ${name} — 📞 ${rc.phone}`, { duration: 8000 });
        setRevealedContacts(prev => ({ ...prev, [reqId]: rc }));
        fetchAvailableRequests();
        fetchMyAccepted();
      } else {
        toast.error(data?.message || 'Could not accept');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error accepting request');
    }
    setAccepting(null);
  };

  const markComplete = async (id) => {
    try {
      const { data } = await API.patch(`/requests/${id}/complete`);
      if (data?.success) { toast.success('Donation marked complete!'); fetchMyAccepted(); }
    } catch (err) { toast.error('Error'); }
  };

  const getHospitalMapsUrl = (request) => {
    const origin = selectedLocation
      ? `${selectedLocation.lat},${selectedLocation.lng}`
      : '';

    if (request.location_lat != null && request.location_lng != null) {
      return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}&destination=${encodeURIComponent(`${request.location_lat},${request.location_lng}`)}&travelmode=driving`;
    }
    if (request.requesterLocationLat != null && request.requesterLocationLng != null) {
      return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}&destination=${encodeURIComponent(`${request.requesterLocationLat},${request.requesterLocationLng}`)}&travelmode=driving`;
    }
    const destination = request.requesterAddress || request.address || request.requesterName || '';
    return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  };

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <ProgressBar visible height="120" width="120" color="#d32f2f" ariaLabel="loading" />
    </div>
  );

  return (
    <div className="container mt-3">
      <div className="card mb-3" style={{ borderRadius: 12, border: '1px solid #e0e0e0' }}>
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <img src={profilePicture || './assets/logo.png'} alt="Donor profile"
              style={{ width: 92, height: 92, objectFit: 'cover', borderRadius: '50%', border: '3px solid #f2caca' }} />
            <div>
              <h5 className="mb-1">{user?.name || 'Donor Profile'}</h5>
              <label className="btn btn-outline-danger btn-sm mb-0">
                <i className="fa-solid fa-camera me-1"></i>
                {profilePicture ? 'Change Profile Picture' : 'Add Profile Picture'}
                <input type="file" accept="image/*" onChange={selectProfilePicture} className="d-none" />
              </label>
              <div className="text-muted mt-1" style={{ fontSize: 12 }}>Maximum 2 MB.</div>
            </div>
            <div className="ms-md-auto d-flex flex-wrap gap-2">
              <button className="btn btn-primary btn-sm" onClick={setMyLocation} disabled={geoLoading}>
                <i className="fa-solid fa-crosshairs me-1"></i>
                {geoLoading ? 'Detecting...' : 'Set Location by GPS'}
              </button>
              <button className="btn btn-outline-primary btn-sm" onClick={() => setShowMap(value => !value)}>
                <i className="fa-solid fa-map-location-dot me-1"></i>
                {showMap ? 'Hide Map' : 'Select on Map'}
              </button>
              <button className="btn btn-outline-dark btn-sm" onClick={() => setShowSettings(value => !value)}>
                <i className="fa-solid fa-user-gear me-1"></i>
                {showSettings ? 'Close Profile Settings' : 'Edit Profile Settings'}
              </button>
            </div>
          </div>

          {showSettings && (
            <form className="mt-4 border-top pt-3" onSubmit={saveProfileSettings}>
              <h6 className="mb-3">Profile Settings</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full name</label>
                  <input className="form-control" value={profileSettings.name}
                    onChange={event => setProfileSettings({ ...profileSettings, name: event.target.value })} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={profileSettings.email}
                    onChange={event => setProfileSettings({ ...profileSettings, email: event.target.value })} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={profileSettings.phone}
                    onChange={event => setProfileSettings({ ...profileSettings, phone: event.target.value })} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Blood group</label>
                  <select className="form-select" value={profileSettings.bloodGroup}
                    onChange={event => setProfileSettings({ ...profileSettings, bloodGroup: event.target.value })} required>
                    <option value="">Select blood group</option>
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(group =>
                      <option key={group} value={group}>{group}</option>)}
                  </select>
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <div className="form-check form-switch mb-2">
                    <input className="form-check-input" type="checkbox" role="switch"
                      checked={profileSettings.isAvailable}
                      onChange={event => setProfileSettings({ ...profileSettings, isAvailable: event.target.checked })} />
                    <label className="form-check-label">Available for donation</label>
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label">Address</label>
                  <textarea className="form-control" rows="2" value={profileSettings.address}
                    onChange={event => setProfileSettings({ ...profileSettings, address: event.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn btn-danger btn-sm mt-3" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Profile Settings'}
              </button>
            </form>
          )}

          {showMap && (
            <div className="mt-3">
              <p className="text-muted mb-2">Tap your exact location on the map.</p>
              <MapContainer center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [15.9129, 79.74]}
                zoom={selectedLocation ? 13 : 7} style={{ height: 320, borderRadius: 10 }}>
                <TileLayer attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapLocationPicker position={selectedLocation} onSelect={setSelectedLocation} />
              </MapContainer>
              {selectedLocation && (
                <small className="text-muted d-block mt-2">
                  Selected: {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </small>
              )}
              <button className="btn btn-danger btn-sm mt-2" onClick={saveProfileLocation} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save as My Location'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Available requests */}
      <div className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="mb-0">
            <i className="fa-solid fa-droplet text-danger me-2"></i>
            Blood Requests Near You
            <span className="badge bg-danger ms-2">{availableRequests.length}</span>
          </h5>
          <span className="text-muted" style={{ fontSize: 12 }}>
            <i className="fa-solid fa-rotate-right me-1"></i>Live — updates every 8s
          </span>
        </div>

        {availableRequests.length === 0 ? (
          <div className="text-center py-4 text-muted" style={{ background: '#fafafa', borderRadius: 10 }}>
            <i className="fa-solid fa-circle-check mb-2" style={{ fontSize: 32, color: '#ccc' }}></i>
            <p className="mb-0">No pending requests right now</p>
          </div>
        ) : (
          <div className="row g-3">
            {availableRequests.map(req => {
              const revealed = revealedContacts[req._id];
              return (
                <div key={req._id} className="col-md-6">
                  <div className="card h-100" style={{ borderRadius: 10, border: '1px solid #ffcdd2', background: '#fff8f8' }}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span style={{ fontSize: 32, fontWeight: 800, color: '#d32f2f' }}>{req.bloodGroup}</span>
                        {statusBadge(req.status)}
                      </div>
                      <div style={{ fontSize: 13, color: '#555' }}>
                        <div><b>{req.requesterName}</b> ({req.requesterRole})</div>
                        {req.address && <div><i className="fa-solid fa-location-dot me-1 text-muted"></i>{req.address}</div>}
                        {req.notes && <div className="text-muted mt-1">{req.notes}</div>}
                        <div className="text-muted mt-1">{moment(req.createdAt).fromNow()}</div>
                      </div>

                      {req.patientName && (
                        <div className="d-flex align-items-center gap-2 mt-2 p-2 rounded" style={{ background: '#fff' }}>
                          {req.patientPhoto && <img src={req.patientPhoto} alt={req.patientName} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8 }} />}
                          <div><b>Patient:</b> {req.patientName}</div>
                        </div>
                      )}
                      {parsePatientDocuments(req.patientDocuments).length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {parsePatientDocuments(req.patientDocuments).map((document, index) => (
                            <a key={`${document.name}-${index}`} href={document.data} target="_blank" rel="noopener noreferrer" title={document.name}>
                              <img src={document.data} alt={document.name || 'Patient document'} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
                            </a>
                          ))}
                        </div>
                      )}

                      {revealed ? (
                        <div className="mt-2 p-2 rounded" style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                          <strong style={{ color: '#2e7d32', fontSize: 13 }}>✅ Accepted — Contact Info:</strong>
                          <div style={{ fontSize: 13 }} className="mt-1">
                            <b>{revealed.name || revealed.hospitalName || ''}</b><br />
                            📞 <a href={`tel:${revealed.phone}`}>{revealed.phone}</a><br />
                            ✉️ {revealed.email}
                          </div>
                          <a className="btn btn-primary btn-sm mt-2" href={getHospitalMapsUrl(req)} target="_blank" rel="noopener noreferrer">
                            <i className="fa-solid fa-location-arrow me-1"></i>Navigate to Hospital
                          </a>
                        </div>
                      ) : (
                        <button className="btn btn-danger btn-sm mt-2 px-3"
                          onClick={() => acceptRequest(req._id)} disabled={accepting === req._id}>
                          {accepting === req._id
                            ? <span className="spinner-border spinner-border-sm me-1"></span>
                            : null}
                          Accept &amp; Reveal Contact
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My accepted donations */}
      {myRequests.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-3">
            <i className="fa-solid fa-handshake me-2 text-success"></i>My Accepted Donations
          </h5>
          {myRequests.map(r => (
            <div key={r._id} className="card mb-2" style={{ borderRadius: 10, border: '1px solid #c8e6c9' }}>
              <div className="card-body py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#d32f2f' }}>{r.bloodGroup}</span>
                    <span className="ms-2">{statusBadge(r.status)}</span>
                    <span className="ms-2 text-muted" style={{ fontSize: 12 }}>
                      {r.requesterName} — {r.requesterPhone}
                    </span>
                  </div>
                  {r.status === 'accepted' && (
                    <div className="d-flex gap-2">
                      <a className="btn btn-sm btn-primary" href={getHospitalMapsUrl(r)} target="_blank" rel="noopener noreferrer">
                        <i className="fa-solid fa-location-arrow me-1"></i>Navigate to Hospital
                      </a>
                      <button className="btn btn-sm btn-success" onClick={() => markComplete(r._id)}>
                        <i className="fa-solid fa-check me-1"></i>Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Donation history */}
      <h5 className="mb-3">
        <i className="fa-solid fa-clock-rotate-left me-2 text-secondary"></i>Donation History
      </h5>
      <table className="table table-hover">
        <thead className="table-light">
          <tr><th>Name</th><th>Email</th><th>Phone</th><th>Date</th></tr>
        </thead>
        <tbody>
          {donationHistory.length === 0 ? (
            <tr><td colSpan={4} className="text-center text-muted py-3">No donation history yet</td></tr>
          ) : donationHistory.map(record => (
            <tr key={record._id}>
              <td>{record.name || `${record.organisationName} (ORG)`}</td>
              <td>{record.email}</td>
              <td>{record.phone}</td>
              <td>{moment(record.createdAt).format('DD/MM/YYYY hh:mm A')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main export — routes to the right view by role
// ─────────────────────────────────────────────
const Donar = () => {
  const { user } = useSelector(state => state.auth);
  return (
    <Layout>
      {user?.role === 'organisation' ? <OrgDonorList /> : <DonorView />}
    </Layout>
  );
};

export default Donar;
