import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Layout from "../../components/shared/Layout/Layout";
import API from "./../../services/API";
import moment from "moment";

const Analytics = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [inventoryData,setInventoryData] = useState([]);
  const [requestStats, setRequestStats] = useState(null);
  const [requestStatsError, setRequestStatsError] = useState("");
  const [requestStatsLoading, setRequestStatsLoading] = useState(false);
  const [donations, setDonations] = useState([]);
  const [donationsError, setDonationsError] = useState("");
  const [donationsLoading, setDonationsLoading] = useState(false);
  const colors = ['#98D8FF','#FF8080','#F8F0E5','#F6FDC3', '#CDFAD5','#CDF0EA', '#F6C6EA', '#DFCCFB']

  useEffect(() => {
    if (user?.role !== "hospital") return undefined;

    let active = true;
    const getHospitalDonations = async () => {
      setDonationsLoading(true);
      setDonationsError("");
      try {
        const { data } = await API.get("/analytics/hospital-donations");
        if (active && data?.success) {
          setDonations(data.donations);
        } else if (active) {
          setDonationsError(data?.message || "Unable to load completed donations.");
        }
      } catch (error) {
        if (active) {
          setDonationsError(error?.response?.data?.message || "Unable to load completed donations.");
        }
      } finally {
        if (active) setDonationsLoading(false);
      }
    };

    const getHospitalRequestStats = async () => {
      setRequestStatsLoading(true);
      setRequestStatsError("");
      try {
        const { data } = await API.get("/analytics/hospital-requests");
        if (active && data?.success) {
          setRequestStats(data.stats);
        } else if (active) {
          setRequestStatsError(data?.message || "Unable to load request statistics.");
        }
      } catch (error) {
        if (active) {
          setRequestStatsError(error?.response?.data?.message || "Unable to load request statistics.");
        }
      } finally {
        if (active) setRequestStatsLoading(false);
      }
    };

    getHospitalDonations();
    getHospitalRequestStats();
    return () => {
      active = false;
    };
  }, [user?.role]);


  const getBloodRecords= async()=>{
    try {
      const {data} = await API.get('/inventory/get-recent-inventory');
      if(data?.success){
        setInventoryData(data?.inventory);
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(()=>{
    getBloodRecords();
  },[])

  useEffect(() => {
    if (user?.role === "hospital") return undefined;

    const getBloodGroupData = async () => {
      try {
        const { data } = await API.get("/analytics/bloodGroups-data");
        if (data?.success) {
          setData(data?.bloodGroupData);
        }
      } catch (error) {
        console.error(error);
      }
    };

    getBloodGroupData();
    return undefined;
  }, [user?.role]);

  return (
    <Layout>
      {user?.role === "hospital" && (
        <section className="container mt-4" aria-labelledby="hospital-request-analytics-title">
          <h2 id="hospital-request-analytics-title" className="mb-3">Your Blood Request Analytics</h2>
          {requestStatsLoading && <p role="status">Loading your request statistics...</p>}
          {requestStatsError && <p className="alert alert-danger" role="alert">{requestStatsError}</p>}
          {requestStats && (
            <div
              className="card p-4"
              style={{
                border: "1px solid #e7edf3",
                borderRadius: 16,
                boxShadow: "0 8px 24px rgba(31, 51, 73, 0.07)",
              }}
            >
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                <h3 className="h5 mb-0" style={{ color: "#24364b", fontWeight: 700 }}>
                  Request status overview
                </h3>
                <span
                  className="px-3 py-2 rounded-pill"
                  style={{ backgroundColor: "#f1f5f9", color: "#526579", fontSize: 14 }}
                >
                  Total requests <strong className="ms-1" style={{ color: "#24364b" }}>{requestStats.totalRequests}</strong>
                </span>
              </div>
              {[
                { label: "Total requests", value: requestStats.totalRequests, color: "#3765b0", track: "#eaf0fb" },
                { label: "Accepted", value: requestStats.acceptedRequests, color: "#13856b", track: "#e8f5f1" },
                { label: "Pending", value: requestStats.pendingRequests, color: "#c27a12", track: "#fbf2e5" },
              ].map((item) => {
                const percentage = requestStats.totalRequests
                  ? Math.round((item.value / requestStats.totalRequests) * 100)
                  : 0;
                return (
                  <div className="mb-4" key={item.label}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span style={{ color: "#526579", fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                      <strong style={{ color: "#24364b", fontSize: 15 }}>{item.value}</strong>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={item.label}
                      aria-valuenow={percentage}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      style={{
                        height: 12,
                        overflow: "hidden",
                        borderRadius: 999,
                        backgroundColor: item.track,
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`,
                          boxShadow: percentage ? `0 1px 5px ${item.color}55` : "none",
                          transition: "width 500ms ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
      {user?.role === "hospital" ? (
        <section className="container mt-4" aria-labelledby="completed-donations-title">
          <h2 id="completed-donations-title" className="mb-3">Completed Donations</h2>
          {donationsLoading && <p role="status">Loading completed donations...</p>}
          {donationsError && <p className="alert alert-danger" role="alert">{donationsError}</p>}
          {!donationsLoading && !donationsError && donations.length === 0 && (
            <p className="text-muted">No completed donations yet.</p>
          )}
          <div className="row g-3">
            {donations.map((donation) => (
              <div className="col-12 col-lg-6" key={donation._id}>
                <article className="card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h3 className="h5 mb-0">Donation details</h3>
                      <span className="badge bg-danger">{donation.bloodGroup}</span>
                    </div>
                    <div className="d-flex flex-wrap gap-4">
                      {[
                        { label: "Patient", name: donation.patientName, photo: donation.patientPhoto },
                        { label: "Donor", name: donation.donorName, photo: donation.donorProfilePicture },
                      ].map((person) => (
                        <div className="d-flex align-items-center gap-3" key={person.label}>
                          {person.photo ? (
                            <img
                              src={person.photo}
                              alt={`${person.label}: ${person.name || "photo"}`}
                              className="rounded-circle"
                              style={{ width: 64, height: 64, objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                              role="img"
                              aria-label={`${person.label} photo unavailable`}
                              style={{ width: 64, height: 64 }}
                            >
                              <i className="fa-solid fa-user text-secondary" aria-hidden="true"></i>
                            </div>
                          )}
                          <div>
                            <div className="text-muted small">{person.label}</div>
                            <strong>{person.name || "Name unavailable"}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mb-0 mt-3 text-muted">
                      <i className="fa-regular fa-clock me-2" aria-hidden="true"></i>
                      Completed: {moment(donation.completedAt).format("DD/MM/YYYY hh:mm A")}
                    </p>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="d-flex flex-row flex-wrap align-items-center justify-content-center">
          {data.map((record,i) => (
            <div className="card m-3 p-2" key={record.bloodGroup} style={{ width: "18rem", borderRadius: '10px' ,backgroundColor:`${colors[i]}` }}>
              <div className="card-body">
                <h1 className="card-title card_title bg-light text-dark text-center mb-3">{record.bloodGroup}</h1>
                <p className="card-text">
                  Total In : <b>{record.totalIn}</b> ml
                </p>
                <p className="card-text">
                  Total Out : <b>{record.totalOut}</b> ml
                </p>
              </div>
              <div className="card-footer card_footer text-light bg-dark text-center">
                Total Available : <b>{record.availabeBlood}</b> ml
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="container mt-3 w-75">
        <h1 className="m-3">Recent Blood Logs</h1>
      <table className="table">
              <thead>
                <tr>
                  <th scope="col">Blood Groud</th>
                  <th scope="col">InventoryType</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Donar Email</th>
                  <th scope="col">Time Date</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData?.map((record)=>(
                  <tr className={(record.inventoryType.toLowerCase() === 'in') ? 'table-success' : 'table-danger'} key={record._id}>
                    <td>{record.bloodGroup}</td>
                    <td>{record.inventoryType.toUpperCase()}</td>
                    <td>{record.quantity} ml</td>
                    <td>{record.email}</td>
                    <td>{moment(record.createdAt).format("DD/MM/YYYY hh:mm A")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
      </div>
    </Layout>
  );
};

export default Analytics;
