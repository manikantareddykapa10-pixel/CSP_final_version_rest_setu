import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Layout from '../components/shared/Layout/Layout';
import API from '../services/API';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['All', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const DEFAULT_CENTER = [28.6692, 77.4538]; // Ghaziabad
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

const BloodMap = () => {
  const { user } = useSelector(state => state.auth);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);
  const [mapData, setMapData] = useState({ donors: [], requests: [] });
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ donors: 0, pending: 0, accepted: 0 });

  const fetchMapData = useCallback(async () => {
    try {
      const { data } = await API.get('/requests/map');
      if (data?.success) {
        setMapData(data);
        setStats({
          donors: data.donors.length,
          pending: data.requests.filter(r => r.status === 'pending').length,
          accepted: data.requests.filter(r => r.status === 'accepted').length,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const L = window.L;
    const map = L.map(mapRef.current).setView(DEFAULT_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    leafletMap.current = map;
    markersLayer.current = L.layerGroup().addTo(map);

    // Accept button handler via event delegation
    map.on('popupopen', (e) => {
      const btn = e.popup.getElement()?.querySelector('[data-accept-id]');
      if (btn) {
        btn.addEventListener('click', async () => {
          const reqId = btn.getAttribute('data-accept-id');
          try {
            const { data } = await API.patch(`/requests/${reqId}/accept`);
            if (data?.success) {
              const rc = data.requesterContact;
              toast.success(`Accepted! Requester: ${rc.name || rc.hospitalName || ''} — ${rc.phone}`);
              map.closePopup();
              fetchMapData();
            } else {
              toast.error(data?.message || 'Could not accept');
            }
          } catch (err) {
            toast.error(err?.response?.data?.message || 'Error accepting');
          }
        });
      }
    });

    return () => { map.remove(); leafletMap.current = null; };
  }, [fetchMapData]);

  // Render markers whenever data or filter changes
  useEffect(() => {
    if (!leafletMap.current || !markersLayer.current) return;
    const L = window.L;
    markersLayer.current.clearLayers();

    const isDonor = user?.role === 'donar';

    const acceptedDonorIds = new Set(
      mapData.requests.filter(request => request.status === 'accepted' && request.acceptedDonor)
        .map(request => request.acceptedDonor.id)
    );

    // Donor markers (blue)
    mapData.donors.forEach(d => {
      if (filter !== 'All' && d.bloodGroup !== filter) return;
      if (acceptedDonorIds.has(d.id)) return;
      const marker = L.circleMarker([d.lat, d.lng], {
        radius: 13, fillColor: '#1a73e8', color: '#0d47a1', weight: 2, fillOpacity: 0.85
      });
      marker.bindPopup(`
        <div style="min-width:160px">
          <strong style="color:#1a73e8">🩸 Donor</strong><br/>
          <b>${d.name}</b><br/>
          Blood Group: <b>${d.bloodGroup}</b><br/>
          ${d.address ? `📍 ${d.address}<br/>` : ''}
          Status: <span style="color:${d.isAvailable ? 'green' : 'gray'}">${d.isAvailable ? '✅ Available' : '⏸ Unavailable'}</span>
        </div>
      `);
      markersLayer.current.addLayer(marker);
    });

    // Accepted donor markers (green) with contact profile cards
    mapData.requests.forEach(request => {
      if (request.status !== 'accepted' || !request.acceptedDonor) return;
      const donor = request.acceptedDonor;
      if (filter !== 'All' && donor.bloodGroup !== filter) return;
      if (donor.lat == null || donor.lng == null) return;
      const marker = L.circleMarker([donor.lat, donor.lng], {
        radius: 14, fillColor: '#2e7d32', color: '#ffffff', weight: 3, fillOpacity: 1
      });
      const image = donor.profilePicture
        ? `<img src="${escapeHtml(donor.profilePicture)}" alt="Donor profile" style="width:72px;height:72px;object-fit:cover;border-radius:50%;display:block;margin:0 auto 8px">`
        : `<div style="width:72px;height:72px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 8px">🩸</div>`;
      marker.bindPopup(`
        <div style="min-width:190px;text-align:center">
          ${image}
          <strong style="font-size:16px;color:#2e7d32">${escapeHtml(donor.name || 'Accepted Donor')}</strong><br/>
          Blood Group: <b>${escapeHtml(donor.bloodGroup || 'Not set')}</b><br/>
          Phone: <b><a href="tel:${escapeHtml(donor.phone || '')}">${escapeHtml(donor.phone || 'Not provided')}</a></b><br/>
          <span style="display:inline-block;margin-top:8px;padding:3px 10px;border-radius:12px;background:#e8f5e9;color:#2e7d32;font-weight:bold">Accepted Request</span>
        </div>
      `, { maxWidth: 230 });
      markersLayer.current.addLayer(marker);
    });

    // Request markers
    mapData.requests.forEach(r => {
      if (filter !== 'All' && r.bloodGroup !== filter) return;
      const isPending = r.status === 'pending';
      const color = isPending ? '#d32f2f' : '#f57c00';
      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 15, fillColor: color, color: isPending ? '#b71c1c' : '#e65100',
        weight: 2, fillOpacity: 0.85
      });

      const acceptBtn = (isDonor && isPending)
        ? `<button data-accept-id="${r.id}" style="margin-top:8px;width:100%;padding:5px 10px;background:#d32f2f;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold">Accept Request</button>`
        : '';

      marker.bindPopup(`
        <div style="min-width:170px">
          <strong style="color:${color}">${isPending ? '🆘 Blood Needed' : '🟠 In Progress'}</strong><br/>
          Group needed: <b style="font-size:16px">${r.bloodGroup}</b><br/>
          By: <b>${r.requesterName}</b><br/>
          ${r.address ? `📍 ${r.address}<br/>` : ''}
          Status: <b>${r.status.toUpperCase()}</b>
          ${acceptBtn}
        </div>
      `);
      markersLayer.current.addLayer(marker);
    });
  }, [mapData, filter, user]);

  // Initial fetch + polling every 15s
  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 15000);
    return () => clearInterval(interval);
  }, [fetchMapData]);

  return (
    <Layout>
      <div className="container-fluid px-4 mt-3">
        {/* Stats bar */}
        <div className="row g-2 mb-3">
          <div className="col">
            <div className="d-flex align-items-center p-2 rounded" style={{ background: '#e3f2fd' }}>
              <i className="fa-solid fa-circle-dot me-2" style={{ color: '#1a73e8' }}></i>
              <span><b>{stats.donors}</b> Donors on map</span>
            </div>
          </div>
          <div className="col">
            <div className="d-flex align-items-center p-2 rounded" style={{ background: '#ffebee' }}>
              <i className="fa-solid fa-circle-dot me-2" style={{ color: '#d32f2f' }}></i>
              <span><b>{stats.pending}</b> Pending requests</span>
            </div>
          </div>
          <div className="col">
            <div className="d-flex align-items-center p-2 rounded" style={{ background: '#fff3e0' }}>
              <i className="fa-solid fa-circle-dot me-2" style={{ color: '#f57c00' }}></i>
              <span><b>{stats.accepted}</b> In progress</span>
            </div>
          </div>
          <div className="col-auto d-flex align-items-center gap-2">
            <label className="mb-0 fw-semibold">Filter:</label>
            <select className="form-select form-select-sm" style={{ width: '90px' }}
              value={filter} onChange={e => setFilter(e.target.value)}>
              {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
            </select>
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchMapData}>
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="d-flex gap-3 mb-2" style={{ fontSize: '13px' }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#1a73e8', marginRight: 4 }}></span>Donor</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#d32f2f', marginRight: 4 }}></span>Pending Request</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#2e7d32', marginRight: 4 }}></span>Accepted Donor</span>
        </div>

        {/* Map container */}
        <div style={{ position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1000, background: 'white', padding: '12px 24px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <div className="spinner-border spinner-border-sm text-danger me-2"></div> Loading map...
            </div>
          )}
          <div ref={mapRef} style={{ height: '68vh', width: '100%', borderRadius: '12px', border: '2px solid #e9ecef' }} />
        </div>

        <p className="text-muted mt-2" style={{ fontSize: '12px' }}>
          <i className="fa-solid fa-rotate-right me-1"></i>Auto-refreshes every 15 seconds.
          {user?.role === 'donar' ? ' Click red markers to accept blood requests.' : ' Click markers for details.'}
        </p>
      </div>
    </Layout>
  );
};

export default BloodMap;
