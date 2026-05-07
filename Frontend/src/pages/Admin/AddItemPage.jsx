import React, { useState, useEffect } from "react";
import "./AddItemPage.css";
import { Link } from "react-router-dom";
import SearchBar from "../../components/Layout/SearchBar";
import { useUser } from "../../contexts/userContext";
import CitySelector from "../../components/CitySelector";
import ErrorMessage from "../../components/Error/ErrorMessage";
import Loader from "../../components/Loader/Loader";

const cityButtonStyle = {
  minWidth: 120,
  padding: "8px 16px",
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#1E1E1E",
  color: "#fff",
  marginBottom: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const suggestionBoxStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  border: "1px solid #ccc",
  zIndex: 10,
  maxHeight: "150px",
  overflowY: "auto",
};

const suggestionItemStyle = {
  padding: "8px",
  cursor: "pointer",
  backgroundColor: "#fff",
  color: "#000",
};


const AddItemPage = () => {
  const { user, loading } = useUser();
  const [city, setCity] = useState();
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [theatres, setTheatres] = useState([]);
  const [selectedTheatre, setSelectedTheatre] = useState(null);
  const [showTheatreSuggestions, setShowTheatreSuggestions] = useState(false);
  const [movies, setMovies] = useState([]);
  const [showMovieSuggestions, setShowMovieSuggestions] = useState(false);
  const [error, setError] = useState();

  const [form, setForm] = useState({
    title: "",
    showTime: "",
    showDate: "",
    theatre: "",
    screenId: "",
    language: "",
    format: "",
  });

  const handleChange = (e) => {
  const { name, value, type, files } = e.target;
  setForm((prev) => ({
    ...prev,
    [name]: type === "file" ? files[0] : value,
  }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  const payload = {
    ...form,
    city,
    title: {
      _id: form.title._id,
      title: form.title.title,
    },
    screen: form.screenId,
  };

  try {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/shows`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to add show");
    }

    setForm({
      title: "",
      showTime: "",
      showDate: "",
      theatre: "",
      screenId: "",
      language: "",
      format: "",
    });
    setSelectedTheatre(null);
  } catch (error) {
    setError(error.message || "Failed to add show");
  }
};

useEffect(() => {
    const getTheatres = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/theatres/${city}`, {
          credentials: "include"
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch theatres");
        }
        setTheatres(data);
      } catch (error) {
        setError(error.message || "Failed to fetch theatres");
      }
    };
    
    if (city) {
      getTheatres();
    }
  }, [city]);

  useEffect(() => {
    const getMovies = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/movies`, {
          credentials: "include"
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch movies");
        }
        setMovies(data);
      } catch (error) {
        setError(error.message || "Failed to fetch movies");
      }
    };
    getMovies();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".title-input")) {
        setShowTheatreSuggestions(false);
        setShowMovieSuggestions(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if(user && user.role !== "admin") {
      setError("You do not have permission to access this page.");
    }
  } , [user]);

  if (loading) return <Loader />;
  return (
    error ? (<ErrorMessage message={error} />) :
    (<div className="admin-root">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/">
            <div className="flix-logo">GetMySeat</div>
          </Link>
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div>
              <div className="user-role">Admin</div>
              <div className="user-name">{user.name}</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link to="/admin/dashboard">Dashboard</Link>
            </li>
            <li className="active">
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
        <div className="sidebar-footer">© GetMySeat, 2025.</div>
      </aside>

      <main className="additem-main">
        <h1 className="additem-title">Add ShowTime</h1>
        <form className="additem-form" onSubmit={handleSubmit}>
          {/* Movie Details Section */}
          <div className="form-section">
            <h3>Movie Details</h3>
            <div className="form-row">
              <div className="form-col">
                <label htmlFor="title">Movie Title</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="title"
                    name="title"
                    placeholder="Search for a movie..."
                    value={
                      typeof form.title === "string"
                        ? form.title
                        : form.title.title || ""
                    }
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setForm((prev) => ({ ...prev, title: inputValue }));
                      setShowMovieSuggestions(true);
                    }}
                    className="form-input title-input"
                    autoComplete="off"
                    required
                  />
                  {showMovieSuggestions &&
                    typeof form.title === "string" &&
                    form.title.trim() && (
                      <ul className="suggestion-box movie-suggestion-box">
                        {movies.length > 0 ? (
                          movies
                            .filter((movie) =>
                              movie.title
                                .toLowerCase()
                                .includes(form.title.toLowerCase())
                            )
                            .map((movie, index) => (
                              <li
                                key={index}
                                onClick={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    title: movie,
                                  }));
                                  setShowMovieSuggestions(false);
                                }}
                                className="suggestion-item"
                              >
                                {movie.title}
                              </li>
                            ))
                        ) : (
                          <li className="suggestion-item no-results">
                            No movies found
                          </li>
                        )}
                      </ul>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* City Selection Section */}
          <div className="form-section">
            <h3>City Selection</h3>
            <div className="form-row">
              <div className="form-col">
                <label>Select City</label>
                <div className="input-wrapper">
                  <button
                    type="button"
                    className="city-selector-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowCitySelector((v) => !v);
                    }}
                  >
                    {city ? city : "Select City"}
                  </button>
                  {showCitySelector && (
                    <div className="city-selector-dropdown">
                      <CitySelector
                        onSelect={(c) => {
                          setCity(c.name);
                          setShowCitySelector(false);
                        }}
                        selectedCityId={null}
                        placeholder="Search city..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Theatre Details Section */}
          <div className="form-section">
            <h3>Theatre Details</h3>
            <div className="form-row">
              <div className="form-col">
                <label htmlFor="theatre">Theatre Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="theatre"
                    name="theatre"
                    placeholder="Search for a theatre..."
                    value={form.theatre}
                    onChange={(e) => {
                      handleChange(e);
                      setShowTheatreSuggestions(true);
                    }}
                    className="form-input theatre-input"
                    autoComplete="off"
                    required
                  />
                  {form.theatre && showTheatreSuggestions && (
                    <ul className="suggestion-box theatre-suggestion-box">
                      {theatres
                        .filter((t) =>
                          t.name
                            .toLowerCase()
                            .includes(form.theatre.toLowerCase())
                        )
                        .map((t, index) => (
                          <li
                            key={index}
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                theatre: t.name,
                                screenId: "",
                              }));
                              setSelectedTheatre(t);
                              setShowTheatreSuggestions(false);
                            }}
                            className="suggestion-item"
                          >
                            {t.name}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {selectedTheatre && selectedTheatre.screens?.length > 0 && (
              <div className="form-row">
                <div className="form-col">
                  <label htmlFor="screenId">Screen/Audi</label>
                  <select
                    name="screenId"
                    id="screenId"
                    className="form-input"
                    value={form.screenId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Screen</option>
                    {selectedTheatre.screens.map((screen) => (
                      <option key={screen._id} value={screen._id}>
                        Audi {screen.audi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Show Details Section */}
          <div className="form-section">
            <h3>Show Details</h3>
            <div className="form-row">
              <div className="form-col">
                <label htmlFor="language">Language</label>
                <select
                  name="language"
                  id="language"
                  value={form.language}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Select Language</option>
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                </select>
              </div>
              <div className="form-col">
                <label htmlFor="format">Format</label>
                <select
                  name="format"
                  id="format"
                  value={form.format}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Select Format</option>
                  <option value="2D">2D</option>
                  <option value="3D">3D</option>
                  <option value="IMAX">IMAX</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-col">
                <label htmlFor="showDate">Show Date</label>
                <input
                  type="date"
                  id="showDate"
                  name="showDate"
                  value={form.showDate}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-col">
                <label htmlFor="showTime">Show Time</label>
                <input
                  type="time"
                  id="showTime"
                  name="showTime"
                  value={form.showTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button type="submit" className="submit-btn">
              PUBLISH SHOW
            </button>
          </div>
        </form>
      </main>
    </div>)
  );
};



export default AddItemPage;
