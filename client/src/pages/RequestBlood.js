import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Layout from '../components/shared/Layout/Layout';
import API from '../services/API';
import toast from 'react-hot-toast';
import moment from 'moment';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const parseDocuments = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const statusBadge = (status) => {
  const map = {
    pending: { bg: '#fff3e0', color: '#e65100', label: '⏳ Pending' },
    accepted: { bg: '#e8f5e9', color: '#2e7d32', label: '✅ Donor Found!' },
    completed: { bg: '#e3f2fd', color: '#1565c0', label: '🎉 Completed' },
    cancelled: { bg: '#f5f5f5', color: '#757575', label: '✖ Cancelled' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 13 }}>
      {s.label}
    </span>
  );
};

const RequestBlood = () => {
  const { user } = useSelector(state => state.auth);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhoto, setPatientPhoto] = useState('');
  const [patientDocuments, setPatientDocuments] = useState([]);
  const [location, setLocation] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const prevRequestsRef = useRef([]);

  const fetchMyRequests = useCallback(async () => {
    try {
      const { data } = await API.get('/requests/mine');
      if (data?.success) {
        const prev = prevRequestsRef.current;
        // Notify if any request changed to 'accepted'
        data.requests.forEach(r => {
          const old = prev.find(p => p._id === r._id);
          if (old && old.status === 'pending' && r.status === 'accepted') {
            toast.success(
              `🎉 Donor found for your ${r.bloodGroup} request!\nDonor: ${r.donorName} — 📞 ${r.donorPhone}`,
              { duration: 8000 }
            );
          }
          if (old && old.status === 'accepted' && r.status === 'completed') {
            toast.success(`✅ Your ${r.bloodGroup} blood request is complete!`, { duration: 5000 });
          }
        });
        prevRequestsRef.current = data.requests;
        setMyRequests(data.requests);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
    const interval = setInterval(fetchMyRequests, 8000);
    return () => clearInterval(interval);
  }, [fetchMyRequests]);

  const getLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success('Location detected!');
        setGeoLoading(false);
      },
      () => {
        toast.error('Could not get location. Please allow location access.');
        setGeoLoading(false);
      }
    );
  };

  const readImage = (file, maxSize) => new Promise((resolve, reject) => {
    if (!file?.type.startsWith('image/')) return reject(new Error('Please select image files only.'));
    if (file.size > maxSize) return reject(new Error(`Each image must be smaller than ${maxSize / 1024 / 1024} MB.`));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });

  const selectPatientPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPatientPhoto(await readImage(file, 2 * 1024 * 1024));
    } catch (error) {
      toast.error(error.message);
      event.target.value = '';
    }
  };

  const selectPatientDocuments = async (event) => {
    const files = Array.from(event.target.files || []);
    if (patientDocuments.length + files.length > 5) {
      toast.error('A maximum of 5 document images can be attached.');
      event.target.value = '';
      return;
    }
    try {
      const documents = await Promise.all(files.map(async file => ({
        name: file.name,
        data: await readImage(file, 1024 * 1024)
      })));
      setPatientDocuments(previous => [...previous, ...documents]);
    } catch (error) {
      toast.error(error.message);
    }
    event.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return toast.error('Please set your location first');
    if (!patientName.trim()) return toast.error('Please enter the patient name');
    if (!patientPhoto) return toast.error('Please add a patient photo');
    setSubmitting(true);
    try {
      const { data } = await API.post('/requests/create', {
        bloodGroup, location_lat: location.lat, location_lng: location.lng, address, notes,
        patientName, patientPhoto, patientDocuments
      });
      if (data?.success) {
        toast.success('Blood request posted! Donors will be notified.');
        setAddress(''); setNotes(''); setPatientName(''); setPatientPhoto('');
        setPatientDocuments([]); setLocation(null);
        fetchMyRequests();
      } else {
        toast.error(data?.message || 'Error posting request');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error posting request');
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    try {
      const { data } = await API.patch(`/requests/${id}/cancel`);
      if (data?.success) { toast.success('Request cancelled'); fetchMyRequests(); }
    } catch (err) {
      toast.error('Error cancelling');
    }
  };

  const handleComplete = async (id) => {
    try {
      const { data } = await API.patch(`/requests/${id}/complete`);
      if (data?.success) { toast.success('Marked as complete!'); fetchMyRequests(); }
    } catch (err) {
      toast.error('Error completing');
    }
  };

  return (
    <Layout>
      <div className="container mt-3" style={{ maxWidth: 800 }}>
        <h4 className="mb-4">
          <i className="fa-solid fa-droplet-slash text-danger me-2"></i>
          Request Blood
        </h4>

        {/* Request form */}
        <div className="card mb-4" style={{ border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 12 }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #d32f2f, #b71c1c)', color: 'white', borderRadius: '12px 12px 0 0' }}>
            <h6 className="mb-0"><i className="fa-solid fa-circle-plus me-2"></i>New Blood Request</h6>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Blood Group Needed *</label>
                  <select className="form-select" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
                    {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="col-md-8">
                  <label className="form-label fw-semibold">Your Location *</label>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-primary" onClick={getLocation} disabled={geoLoading}>
                      {geoLoading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="fa-solid fa-location-dot me-1"></i>}
                      {location ? 'Location Set ✓' : 'Use My Location'}
                    </button>
                    {location && (
                      <span className="text-muted align-self-center" style={{ fontSize: 12 }}>
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Address / Landmark</label>
                  <input className="form-control" placeholder="e.g. Indirapuram, Ghaziabad" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Notes (optional)</label>
                  <textarea className="form-control" rows={2} placeholder="Patient condition, urgency, units needed..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Patient Name *</label>
                  <input className="form-control" required value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Enter patient name" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Patient Photo *</label>
                  <div className="d-flex align-items-center gap-2">
                    {patientPhoto && <img src={patientPhoto} alt="Patient preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />}
                    <label className="btn btn-outline-danger mb-0">
                      <i className="fa-solid fa-camera me-1"></i>{patientPhoto ? 'Change Photo' : 'Add Photo'}
                      <input type="file" accept="image/*" className="d-none" onChange={selectPatientPhoto} />
                    </label>
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Patient Document Images</label>
                  <div>
                    <label className="btn btn-outline-secondary btn-sm mb-2">
                      <i className="fa-solid fa-file-image me-1"></i>Add Document Images
                      <input type="file" accept="image/*" multiple className="d-none" onChange={selectPatientDocuments} />
                    </label>
                    <span className="text-muted ms-2" style={{ fontSize: 12 }}>Maximum 5 images, 1 MB each</span>
                  </div>
                  {patientDocuments.length > 0 && (
                    <div className="d-flex flex-wrap gap-2">
                      {patientDocuments.map((document, index) => (
                        <div key={`${document.name}-${index}`} className="position-relative">
                          <img src={document.data} alt={document.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                          <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 p-0" style={{ width: 22, height: 22 }}
                            onClick={() => setPatientDocuments(previous => previous.filter((_, i) => i !== index))}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-danger px-4" disabled={submitting || !location}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                    Post Request
                  </button>
                  <span className="text-muted ms-3" style={{ fontSize: 12 }}>
                    <i className="fa-solid fa-bell me-1"></i>Nearby donors will be notified automatically
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* My requests list */}
        <h5 className="mb-3">
          <i className="fa-solid fa-list-check me-2 text-secondary"></i>
          My Requests
          <span className="text-muted ms-2" style={{ fontSize: 13 }}>(auto-updates every 8s)</span>
        </h5>

        {myRequests.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="fa-solid fa-droplet mb-3" style={{ fontSize: 40, color: '#e0e0e0' }}></i>
            <p>No blood requests yet</p>
          </div>
        ) : myRequests.map(r => (
          <div key={r._id} className="card mb-3" style={{ borderRadius: 10, border: '1px solid #e9ecef', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#d32f2f' }}>{r.bloodGroup}</span>
                  <span className="ms-3">{statusBadge(r.status)}</span>
                </div>
                <span className="text-muted" style={{ fontSize: 12 }}>{moment(r.createdAt).fromNow()}</span>
              </div>

              {r.address && <p className="mb-1 text-muted" style={{ fontSize: 13 }}><i className="fa-solid fa-location-dot me-1"></i>{r.address}</p>}
              {r.notes && <p className="mb-2 text-muted" style={{ fontSize: 13 }}>{r.notes}</p>}
              {r.patientName && (
                <div className="d-flex align-items-center gap-2 mt-2 p-2 rounded" style={{ background: '#fff8f8' }}>
                  {r.patientPhoto && <img src={r.patientPhoto} alt={r.patientName} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8 }} />}
                  <div><b>Patient:</b> {r.patientName}</div>
                </div>
              )}
              {parseDocuments(r.patientDocuments).length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {parseDocuments(r.patientDocuments).map((document, index) => (
                    <a key={`${document.name}-${index}`} href={document.data} target="_blank" rel="noopener noreferrer">
                      <img src={document.data} alt={document.name || 'Patient document'} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
                    </a>
                  ))}
                </div>
              )}

              {/* Contact reveal when accepted */}
              {r.status === 'accepted' && r.donorName && (
                <div className="p-3 rounded mb-2" style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                  <strong style={{ color: '#2e7d32' }}>🤝 Donor Contact Revealed</strong>
                  <div className="mt-1" style={{ fontSize: 14 }}>
                    <b>{r.donorName}</b> ({r.donorBloodGroup})<br />
                    📞 <a href={`tel:${r.donorPhone}`}>{r.donorPhone}</a> &nbsp;
                    ✉️ {r.donorEmail}
                  </div>
                </div>
              )}

              <div className="d-flex gap-2 mt-2">
                {r.status === 'accepted' && r.requestedBy === user?._id && (
                  <button className="btn btn-sm btn-success" onClick={() => handleComplete(r._id)}>
                    <i className="fa-solid fa-check me-1"></i>Mark Complete
                  </button>
                )}
                {r.status === 'pending' && r.requestedBy === user?._id && (
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => handleCancel(r._id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default RequestBlood;
