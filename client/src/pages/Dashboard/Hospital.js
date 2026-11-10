import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import Layout from '../../components/shared/Layout/Layout'
import API from '../../services/API';
import moment from 'moment';
import { ProgressBar } from 'react-loader-spinner';
import toast from 'react-hot-toast';
import { updateCurrentUser } from '../../redux/features/auth/authSlice';

const Hospital = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [data, setData] = useState([]);
    const [temp,setTemp] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profilePicture, setProfilePicture] = useState('');
    const [profile, setProfile] = useState({
      hospitalName: '',
      email: '',
      phone: '',
      address: '',
      website: '',
    });

    useEffect(() => {
      if (user?.role !== 'hospital') return;
      setProfile({
        hospitalName: user.hospitalName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        website: user.website || '',
      });
      setProfilePicture(user.profilePicture || '');
    }, [user]);

    //find donar records
    const getDonars = async () => {
      try {
        const { data } = await API.get("/inventory/get-hospitals");
          console.log(data);
        if (data?.success) {
          setData(data?.hospitals);
        }
      } catch (error) {
        console.log(error);
      }finally{
        setTemp(false);
      }
    };
  
    useEffect(() => {
        if (!user || user.role === 'hospital') return;
        setTemp(true);
        getDonars();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role]);

    const selectProfilePicture = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.');
        event.target.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Profile image must be smaller than 2 MB.');
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setProfilePicture(reader.result);
      reader.onerror = () => toast.error('Could not read the selected image.');
      reader.readAsDataURL(file);
    };

    const saveProfile = async (event) => {
      event.preventDefault();
      setSaving(true);
      try {
        const { data } = await API.patch('/auth/update-profile', {
          ...profile,
          profilePicture,
        });
        if (!data?.success) {
          toast.error(data?.message || 'Could not save hospital profile.');
          return;
        }
        dispatch(updateCurrentUser(data.user));
        toast.success('Hospital profile updated.');
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Could not save hospital profile.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <Layout>
          {user?.role === 'hospital' ? (
          <div className="container mt-4">
            <div className="card shadow-sm mx-auto" style={{ maxWidth: 820, borderRadius: 14 }}>
              <div className="card-body p-4">
                <h2 className="h4 mb-4">Hospital Profile</h2>
                <form onSubmit={saveProfile}>
                  <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Hospital profile"
                        className="rounded-circle"
                        style={{ width: 96, height: 96, objectFit: 'cover', border: '3px solid #e8eef5' }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                        role="img"
                        aria-label="No hospital profile image"
                        style={{ width: 96, height: 96, border: '3px solid #e8eef5' }}
                      >
                        <i className="fa-solid fa-hospital text-secondary fs-3" aria-hidden="true"></i>
                      </div>
                    )}
                    <div>
                      <label className="btn btn-outline-primary btn-sm mb-1">
                        <i className="fa-solid fa-camera me-2" aria-hidden="true"></i>
                        {profilePicture ? 'Change image' : 'Add hospital image'}
                        <input type="file" accept="image/*" onChange={selectProfilePicture} className="d-none" />
                      </label>
                      <div className="text-muted small">Image files only, maximum 2 MB.</div>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="hospital-name" className="form-label">Hospital name</label>
                      <input
                        id="hospital-name"
                        className="form-control"
                        value={profile.hospitalName}
                        onChange={(event) => setProfile({ ...profile, hospitalName: event.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="hospital-email" className="form-label">Email</label>
                      <input
                        id="hospital-email"
                        type="email"
                        className="form-control"
                        value={profile.email}
                        onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="hospital-phone" className="form-label">Phone</label>
                      <input
                        id="hospital-phone"
                        type="tel"
                        className="form-control"
                        value={profile.phone}
                        onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="hospital-website" className="form-label">Website</label>
                      <input
                        id="hospital-website"
                        type="url"
                        className="form-control"
                        value={profile.website}
                        onChange={(event) => setProfile({ ...profile, website: event.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="col-12">
                      <label htmlFor="hospital-address" className="form-label">Address</label>
                      <textarea
                        id="hospital-address"
                        className="form-control"
                        rows="3"
                        value={profile.address}
                        onChange={(event) => setProfile({ ...profile, address: event.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end mt-4">
                    <button className="btn btn-primary" type="submit" disabled={saving}>
                      <i className="fa-solid fa-floppy-disk me-2" aria-hidden="true"></i>
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          ) : temp ? (
          <div className="d-flex justify-content-center align-items-center">
            <ProgressBar
              visible={true}
              height="200"
              width="200"
              color="#4fa94d"
              ariaLabel="progress-bar-loading"
              wrapperStyle={{}}
              wrapperClass=""
            />
          </div>
        ) : (
          <div className="container mt-4">
            <table className="table m-3 border-primary">
            <thead>
              <tr className='table-active'>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Address</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((record) => (
                <tr key={record._id}>
                  <td>{record.hospitalName}</td>
                  <td>{record.email}</td>
                  <td>{record.phone}</td>
                  <td>{record.address}</td>
                  <td>{moment(record.createdAt).format("DD/MM/YYYY hh:mm A")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Layout>
  )
}

export default Hospital