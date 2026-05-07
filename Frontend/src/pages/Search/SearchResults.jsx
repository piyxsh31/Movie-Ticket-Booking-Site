import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import MovieCard from "../../components/MovieCard/MovieCard";
import Header from "../../components/Layout/Header";
import styles from "./SearchResults.module.css";
import Loader from "../../components/Loader/Loader";
import ErrorMessage from "../../components/Error/ErrorMessage";

function SearchResults({ parameter, onClose }) {
  const isOverlay = !useParams().parameter; 
  const searchParam = parameter || useParams().parameter;
  const [demoMovies, setDemoMovies] = useState([]);
  const [movies, setMovies] = useState(demoMovies);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [filters, setFilters] = useState({
    genres: [],
    minYear: "",
    maxYear: "",
    minRating: "",
    maxRating: "",
    minPrice: "",
    maxPrice: "",
  });
  useEffect(() => {
    const dataSet = async () => {
      try{
      const moviesData = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/movies`);
      if (!moviesData.ok) {
        throw new Error("Failed to fetch movies");
      }
      setDemoMovies(await moviesData.json());
      setLoading(false);
      }
      catch(error){
        setError(error.message);
        setLoading(false);
      }
    };

    dataSet();
  }, []);

  const availableGenres = [
    ...new Set(demoMovies.flatMap((movie) => movie.genres)),
  ];

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleGenreToggle = (genre) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  useEffect(() => {
    if (loading) {
      return;
    }
    let filteredMovies = demoMovies.filter((movie) => {
      if (
        parameter &&
        !movie.title.toLowerCase().includes(parameter.toLowerCase())
      ) {
        return false;
      }

      // Genre filter
      if (
        filters.genres.length > 0 &&
        !filters.genres.some((genre) => movie.genres.includes(genre))
      ) {
        return false;
      }

      // Year filter
      if (filters.minYear && movie.year < parseInt(filters.minYear))
        return false;
      if (filters.maxYear && movie.year > parseInt(filters.maxYear))
        return false;

      // Rating filter
      if (
        filters.minRating &&
        (!movie.ratings ||
          typeof movie.ratings.imdbRating !== "number" ||
          movie.ratings.imdbRating < parseFloat(filters.minRating))
      )
        return false;
      if (
        filters.maxRating &&
        (!movie.ratings ||
          typeof movie.ratings.imdbRating !== "number" ||
          movie.ratings.imdbRating > parseFloat(filters.maxRating))
      )
        return false;

      return true;
    });

    setMovies(filteredMovies);
    console.log(filteredMovies);
  }, [parameter, filters, demoMovies]);

  if(error) {
    return <ErrorMessage message={error} />;

  }

  return (
    <div className={`${styles.container} ${isOverlay ? styles.overlay : ""}`}>
      {isOverlay ? (
        onClose && (
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close search"
          >
            ✕
          </button>
        )
      ) : (
        <Header />
      )}
      {loading ? (
        <Loader />
      ) : (
        <div className={styles.content}>
          <aside className={styles.filters}>
            <h2>Filters</h2>

            {/* Genres */}
            <div className={styles.filterSection}>
              <h3>Genres</h3>
              <div className={styles.genreList}>
                {availableGenres.map((genre) => (
                  <label key={genre} className={styles.genreItem}>
                    <input
                      type="checkbox"
                      checked={filters.genres.includes(genre)}
                      onChange={() => handleGenreToggle(genre)}
                    />
                    {genre}
                  </label>
                ))}
              </div>
            </div>

            {/* Year Range */}
            <div className={styles.filterSection}>
              <h3>Year</h3>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="Min Year"
                  value={filters.minYear}
                  onChange={(e) =>
                    handleFilterChange("minYear", e.target.value)
                  }
                />
                <input
                  type="number"
                  placeholder="Max Year"
                  value={filters.maxYear}
                  onChange={(e) =>
                    handleFilterChange("maxYear", e.target.value)
                  }
                />
              </div>
            </div>

            {/* Rating Range */}
            <div className={styles.filterSection}>
              <h3>Rating</h3>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Min Rating"
                  value={filters.minRating}
                  onChange={(e) =>
                    handleFilterChange("minRating", e.target.value)
                  }
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Max Rating"
                  value={filters.maxRating}
                  onChange={(e) =>
                    handleFilterChange("maxRating", e.target.value)
                  }
                />
              </div>
            </div>
          </aside>

          <main className={styles.results}>
            <h2>Search Results for "{parameter}"</h2>
            <div className={styles.movieGrid}>
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
            {movies.length === 0 && (
              <div className={styles.noResults}>
                No movies found matching your criteria
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default SearchResults;
