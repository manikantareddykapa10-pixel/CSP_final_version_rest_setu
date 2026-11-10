const { getDb, generateId } = require('../config/db');

const createRequest = async (req, res) => {
  try {
    const { bloodGroup, location_lat, location_lng, address, notes, patientName, patientPhoto, patientDocuments } = req.body;
    const requestedBy = req.body.userId;
    if (!bloodGroup) return res.status(400).json({ success: false, message: 'Blood group required' });
    if (!patientName?.trim()) return res.status(400).json({ success: false, message: 'Patient name required' });
    if (!patientPhoto) return res.status(400).json({ success: false, message: 'Patient photo required' });
    let documentsJson = '[]';
    try {
      if (Array.isArray(patientDocuments)) {
        if (patientDocuments.length > 5) {
          return res.status(400).json({ success: false, message: 'A maximum of 5 document images can be attached' });
        }
        documentsJson = JSON.stringify(patientDocuments);
      }
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid patient documents' });
    }
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO requests (_id, bloodGroup, requestedBy, status, location_lat, location_lng, address, notes, patientName, patientPhoto, patientDocuments, createdAt, updatedAt)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, bloodGroup, requestedBy, location_lat || null, location_lng || null, address || '', notes || '', patientName || '', patientPhoto || '', documentsJson, now, now);
    const created = db.prepare('SELECT * FROM requests WHERE _id = ?').get(id);
    return res.status(201).json({ success: true, message: 'Blood request created', request: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error creating request', error: error.message });
  }
};

const getAvailableRequests = async (req, res) => {
  try {
    const db = getDb();
    const donor = db.prepare('SELECT location_lat, location_lng, bloodGroup, isAvailable FROM users WHERE _id = ?')
      .get(req.body.userId);
    const requests = db.prepare(`
      SELECT r.*,
        COALESCE(u.name, u.hospitalName, u.organisationName) as requesterName,
        u.email as requesterEmail, u.phone as requesterPhone, u.role as requesterRole,
        u.location_lat as requesterLocationLat, u.location_lng as requesterLocationLng,
        u.address as requesterAddress
      FROM requests r
      JOIN users u ON r.requestedBy = u._id
      WHERE r.status = 'pending'
      ORDER BY r.createdAt DESC
    `).all();
    const compatibleBlood = {
      'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
      'O+': ['O+', 'A+', 'B+', 'AB+'],
      'A-': ['A-', 'A+', 'AB-', 'AB+'],
      'A+': ['A+', 'AB+'],
      'B-': ['B-', 'B+', 'AB-', 'AB+'],
      'B+': ['B+', 'AB+'],
      'AB-': ['AB-', 'AB+'],
      'AB+': ['AB+']
    };
    const distanceKm = (lat1, lng1, lat2, lng2) => {
      const radians = value => value * Math.PI / 180;
      const earthRadius = 6371;
      const dLat = radians(lat2 - lat1);
      const dLng = radians(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
      return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const matchingRequests = requests.filter(request => {
      if (!donor?.isAvailable) return false;
      const bloodMatches = !donor?.bloodGroup ||
        (compatibleBlood[donor.bloodGroup] || []).includes(request.bloodGroup);
      if (!bloodMatches || donor?.location_lat == null || donor?.location_lng == null ||
          request.location_lat == null || request.location_lng == null) {
        return false;
      }
      const distance = distanceKm(donor.location_lat, donor.location_lng, request.location_lat, request.location_lng);
      return distance <= 900;
    }).map(request => ({
      ...request,
      distanceKm: Number(distanceKm(donor.location_lat, donor.location_lng, request.location_lat, request.location_lng).toFixed(1))
    }));
    return res.status(200).json({ success: true, requests: matchingRequests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching requests', error: error.message });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const donorId = req.body.userId;
    const db = getDb();
    const request = db.prepare('SELECT * FROM requests WHERE _id = ?').get(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request no longer available' });
    if (request.requestedBy === donorId) return res.status(400).json({ success: false, message: 'You cannot accept your own request' });
    const now = new Date().toISOString();
    db.prepare('UPDATE requests SET acceptedBy = ?, status = ?, updatedAt = ? WHERE _id = ?').run(donorId, 'accepted', now, id);
    const donor = db.prepare('SELECT _id, name, email, phone, bloodGroup FROM users WHERE _id = ?').get(donorId);
    const requester = db.prepare('SELECT _id, name, hospitalName, organisationName, email, phone, role FROM users WHERE _id = ?').get(request.requestedBy);
    return res.status(200).json({ success: true, message: 'Request accepted!', donorContact: donor, requesterContact: requester });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error accepting request', error: error.message });
  }
};

const completeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;
    const db = getDb();
    const request = db.prepare('SELECT * FROM requests WHERE _id = ?').get(id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    if (request.requestedBy !== userId && request.acceptedBy !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    db.prepare('UPDATE requests SET status = ?, updatedAt = ? WHERE _id = ?').run('completed', new Date().toISOString(), id);
    return res.status(200).json({ success: true, message: 'Donation marked complete!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error completing request', error: error.message });
  }
};

const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;
    const db = getDb();
    const request = db.prepare('SELECT * FROM requests WHERE _id = ?').get(id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    if (request.requestedBy !== userId) return res.status(403).json({ success: false, message: 'Not authorized' });
    db.prepare('UPDATE requests SET status = ?, updatedAt = ? WHERE _id = ?').run('cancelled', new Date().toISOString(), id);
    return res.status(200).json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error cancelling request', error: error.message });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const userId = req.body.userId;
    const db = getDb();
    const requests = db.prepare(`
      SELECT r.*,
        COALESCE(u1.name, u1.hospitalName, u1.organisationName) as requesterName,
        u1.email as requesterEmail, u1.phone as requesterPhone, u1.role as requesterRole,
        u1.location_lat as requesterLocationLat, u1.location_lng as requesterLocationLng,
        u1.address as requesterAddress,
        u2.name as donorName, u2.email as donorEmail, u2.phone as donorPhone, u2.bloodGroup as donorBloodGroup
      FROM requests r
      JOIN users u1 ON r.requestedBy = u1._id
      LEFT JOIN users u2 ON r.acceptedBy = u2._id
      WHERE r.requestedBy = ? OR r.acceptedBy = ?
      ORDER BY r.createdAt DESC
    `).all(userId, userId);
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching your requests', error: error.message });
  }
};

const getMapData = async (req, res) => {
  try {
    const db = getDb();
    const donors = db.prepare(`
      SELECT _id, name, phone, bloodGroup, profilePicture, address, location_lat, location_lng, isAvailable
      FROM users
      WHERE role = 'donar' AND location_lat IS NOT NULL AND location_lng IS NOT NULL
    `).all();
    const requests = db.prepare(`
      SELECT r._id, r.bloodGroup, r.status, r.location_lat, r.location_lng, r.address, r.createdAt,
        COALESCE(u.name, u.hospitalName, u.organisationName) as requesterName, u.role as requesterRole,
        u2._id as acceptedDonorId, u2.name as acceptedDonorName, u2.phone as acceptedDonorPhone,
        u2.bloodGroup as acceptedDonorBloodGroup, u2.profilePicture as acceptedDonorPicture,
        u2.location_lat as acceptedDonorLat, u2.location_lng as acceptedDonorLng
      FROM requests r
      JOIN users u ON r.requestedBy = u._id
      LEFT JOIN users u2 ON r.acceptedBy = u2._id
      WHERE r.status IN ('pending', 'accepted')
        AND r.location_lat IS NOT NULL AND r.location_lng IS NOT NULL
    `).all();
    return res.status(200).json({
      success: true,
      donors: donors.map(d => ({
        id: d._id, name: d.name, bloodGroup: d.bloodGroup,
        address: d.address, lat: d.location_lat, lng: d.location_lng,
        phone: d.phone, profilePicture: d.profilePicture, isAvailable: !!d.isAvailable
      })),
      requests: requests.map(r => ({
        id: r._id, bloodGroup: r.bloodGroup, status: r.status,
        lat: r.location_lat, lng: r.location_lng, address: r.address,
        requesterName: r.requesterName, requesterRole: r.requesterRole, createdAt: r.createdAt,
        acceptedDonor: r.acceptedDonorId ? {
          id: r.acceptedDonorId, name: r.acceptedDonorName, phone: r.acceptedDonorPhone,
          bloodGroup: r.acceptedDonorBloodGroup, profilePicture: r.acceptedDonorPicture,
          lat: r.acceptedDonorLat, lng: r.acceptedDonorLng
        } : null
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching map data', error: error.message });
  }
};

module.exports = { createRequest, getAvailableRequests, acceptRequest, completeRequest, cancelRequest, getMyRequests, getMapData };
