const userModel = require('../../models/userModel');

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Check blood type compatibility
const checkBloodCompatibility = (donorType, requestedType) => {
  const compatibility = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
  };

  return compatibility[donorType]?.includes(requestedType) || false;
};

// Calculate donor score based on multiple factors
const calculateDonorScore = (donor, requestLocation, requestedBloodType, requestDate) => {
  let score = 0;

  // 1. Blood Type Compatibility (40 points)
  if (checkBloodCompatibility(donor.bloodGroup, requestedBloodType)) {
    score += 40;
    // Exact match bonus
    if (donor.bloodGroup === requestedBloodType) {
      score += 5;
    }
  } else {
    return 0; // Not compatible, skip
  }

  // 2. Location Proximity (30 points)
  if (donor.location && requestLocation) {
    const distance = calculateDistance(
      donor.location.lat,
      donor.location.lng,
      requestLocation.lat,
      requestLocation.lng
    );

    // Closer donors get higher scores
    if (distance <= 5) score += 30;
    else if (distance <= 10) score += 25;
    else if (distance <= 20) score += 20;
    else if (distance <= 50) score += 15;
    else score += 5;

    donor.distance = Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  // 3. Availability (20 points) - Check last donation date
  if (donor.lastDonation) {
    const daysSinceLastDonation = Math.floor(
      (requestDate - new Date(donor.lastDonation)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastDonation >= 56) {
      score += 20; // Fully available
    } else if (daysSinceLastDonation >= 28) {
      score += 10; // Partially available
    } else {
      score += 0; // Not available
      donor.availableIn = 56 - daysSinceLastDonation;
    }
  } else {
    score += 20; // Never donated before, assume available
  }

  // 4. Donation History (10 points) - Reliability
  const totalDonations = donor.totalDonations || 0;
  if (totalDonations >= 10) score += 10;
  else if (totalDonations >= 5) score += 8;
  else if (totalDonations >= 2) score += 5;
  else score += 2;

  return score;
};

// Smart Donor Matching Controller
const smartDonorMatch = async (req, res) => {
  try {
    const {
      bloodType,
      location, // { lat, lng }
      urgency = 'medium', // low, medium, high, critical
      maxDistance = 900, // km
      limit = 20
    } = req.body;

    // Validation
    if (!bloodType || !location) {
      return res.status(400).json({
        success: false,
        message: 'Blood type and location are required'
      });
    }

    // Find all donors
    const allDonors = await userModel.find({ role: 'donar' }).select(
      'name email phone bloodGroup address location lastDonation totalDonations'
    );

    if (!allDonors || allDonors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No donors found in the system'
      });
    }

    const requestDate = new Date();
    const scoredDonors = [];

    // Score each donor
    for (const donor of allDonors) {
      // Add approximate location if not present (Delhi area default for demo)
      if (!donor.location || (!donor.location.lat && !donor.location.lng)) {
        // In production, use geocoding API. For now, random Delhi area coords
        const dlat = 28.5 + Math.random() * 0.3;
        const dlng = 77.0 + Math.random() * 0.4;
        donor.location = { lat: dlat, lng: dlng };
      }

      const score = calculateDonorScore(donor, location, bloodType, requestDate);

      if (score > 0) {
        scoredDonors.push({
          ...donor._doc,
          score: Math.round(score),
          distance: donor.distance,
          availableIn: donor.availableIn
        });
      }
    }

    // Sort by score (descending)
    scoredDonors.sort((a, b) => b.score - a.score);

    // Filter by max distance if location is available
    const nearbyDonors = scoredDonors.filter(
      d => !d.distance || d.distance <= maxDistance
    );

    // Apply limit
    const topDonors = nearbyDonors.slice(0, limit);

    // Prepare response
    const response = {
      success: true,
      message: `Found ${topDonors.length} compatible donors`,
      data: {
        requestedBloodType: bloodType,
        urgency,
        totalMatches: nearbyDonors.length,
        showing: topDonors.length,
        donors: topDonors.map(d => ({
          id: d._id,
          name: d.name,
          bloodGroup: d.bloodGroup,
          phone: d.phone,
          email: d.email,
          address: d.address,
          score: d.score,
          distance: d.distance ? `${d.distance} km` : 'Unknown',
          available: !d.availableIn,
          availableIn: d.availableIn ? `${d.availableIn} days` : null,
          totalDonations: d.totalDonations || 0,
          matchReason: getMatchReason(d.score, d.bloodGroup, bloodType)
        }))
      },
      aiInsights: {
        recommendation: getRecommendation(topDonors.length, urgency),
        estimatedResponseTime: estimateResponseTime(topDonors, urgency)
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Smart Donor Match Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in AI donor matching',
      error: error.message
    });
  }
};

// Helper: Get match reason
const getMatchReason = (score, donorType, requestedType) => {
  if (score >= 80) return 'Excellent match - Close proximity, available, reliable donor';
  if (score >= 60) return 'Good match - Compatible and available';
  if (score >= 40) return 'Fair match - Compatible blood type';
  return 'Low match score';
};

// Helper: Get recommendation based on results
const getRecommendation = (matchCount, urgency) => {
  if (urgency === 'critical' && matchCount < 5) {
    return 'CRITICAL: Limited donors available. Recommend expanding search radius and contacting blood banks.';
  }
  if (urgency === 'high' && matchCount < 10) {
    return 'Recommend contacting top 5 donors immediately and preparing alternative sources.';
  }
  if (matchCount === 0) {
    return 'No compatible donors found. Consider universal donor types or expand search area.';
  }
  if (matchCount > 20) {
    return 'Excellent availability. Contact top-scored donors for best response time.';
  }
  return 'Adequate donor pool available. Contact top matches first.';
};

// Helper: Estimate response time
const estimateResponseTime = (donors, urgency) => {
  if (donors.length === 0) return 'Unknown - No donors available';

  const avgScore = donors.reduce((sum, d) => sum + d.score, 0) / donors.length;

  let baseTime = 60; // minutes
  if (urgency === 'critical') baseTime = 30;
  if (urgency === 'high') baseTime = 45;
  if (urgency === 'low') baseTime = 120;

  // Adjust based on donor quality
  const adjustment = (avgScore / 100) * 0.5; // Up to 50% faster with good matches
  const estimatedTime = Math.round(baseTime * (1 - adjustment));

  return `${estimatedTime} minutes (estimated)`;
};

module.exports = {
  smartDonorMatch
};
