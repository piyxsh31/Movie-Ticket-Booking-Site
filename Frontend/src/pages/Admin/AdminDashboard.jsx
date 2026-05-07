import React, { useState , useEffect} from "react";
import "./AdminDashboard.css";
import { Link } from "react-router-dom";
import { useUser } from "../../contexts/userContext";
import CitySelector from "../../components/CitySelector";
import ErrorMessage from "../../components/Error/ErrorMessage";
import Loader from "../../components/Loader/Loader";


const AdminDashboard = () => {
  const [city, setCity] = useState();
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [error, setError] = useState();
  const [mockShows, setMockShows] = useState([]);
  const { user , loading} = useUser();

  useEffect(() => {
    if (loading) return;
      if(user && user.role !== "admin") {
        setError("You do not have permission to access this page.");
      }
    } , [user]);

    useEffect(() => {
      if (!city) return;
        
      const fetchShows = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/show/${city}`, {
            credentials: "include",
          });
          if (!response.ok) {
            throw new Error("Failed to fetch shows");
          }
          const data = await response.json();
          setMockShows(data);
        } catch (err) {
          setError(err.message);
        }
      }
      fetchShows();
    } , [city]);

  if (loading) return <Loader />;
  return (
    error ? (
      <ErrorMessage message={error} />) : (
    <>
      <section className="admindashboard-root">
        <aside className="sidebar">
          <div className="sidebar-header">
            <Link to="/">
              <div className="flix-logo">GetMySeat</div>
            </Link>
            <div className="user-info">
              <div className="user-avatar">
                <span role="img" aria-label="avatar">
                  👤
                </span>
              </div>
              <div>
                <div className="user-role">Admin</div>
                <div className="user-name">{user.name}</div>
              </div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <ul>
              <li className="active">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li>
                <Link to="/admin/add-item">Add Shows</Link>
              </li>
              <li>
                <Link to="/admin/edit-movies">Edit Movies</Link>
              </li>
              <li>
                <Link to="/admin/edit-cinemas">Edit Cinemas</Link>
              </li>
            </ul>
          </nav>
          <footer className="sidebar-footer">© GetMySeat, 2025.</footer>
        </aside>
        <main className="admindashboard-main">
          <h2 className="admindashboard-title">Admin Dashboard</h2>
          <div className="city-selector" style={{ position: "relative" }}>
            <button
              className="city-btn"
              style={{
                minWidth: 120,
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: "#1E1E1E",
                color: "#fff",
                marginBottom: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={() => setShowCitySelector((v) => !v)}
            >
              {city ? city : "Select City"}
            </button>
            {showCitySelector && (
              <div style={{ position: "absolute", zIndex: 100, top: "110%" }}>
                <CitySelector
                  onSelect={(c) => {
                    setCity(c.name);
                    setShowCitySelector(false);
                  }}
                  selectedCityId={null}
                  placeholder="Search city..."
                  style={{ width: 260 }}
                />
              </div>
            )}
          </div>
          <ul className="dashboard-cards">
            {mockShows.map((show) => (
              <li className="dashboard-card" key={show.id}>
                <h3>{show.movie.title}</h3>
                <p>
                  <strong>Cinema:</strong> {show.theatre.name}
                </p>
                <p>
                  <strong>Showtime:</strong> {show.startTime}
                </p>
              </li>
            ))}
          </ul>
        </main>
      </section>
    </>
      )
  );
};

export default AdminDashboard;
