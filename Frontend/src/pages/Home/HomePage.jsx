import { useEffect, useState } from "react";
import Home from "./Home";
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";
import Loader from "../../components/Loader/Loader";
import { useCity } from "../../contexts/CityContext";
import ErrorMessage from "../../components/Error/ErrorMessage";

function HomePage() {
  const { city } = useCity();
  const [popularMovies, setPopularMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();

  useEffect(() => {
    const fetchAllMovies = async () => {
      try {
        const popularMoviesData = await fetch(
          ` ${import.meta.env.VITE_SERVER_URL}/api/movies/${city}/popular`,
          { credentials: "include" }
        );
        const detailedPopularMovies = await popularMoviesData.json();
        if (!popularMoviesData.ok) {
          throw new Error(
            detailedPopularMovies.message || "Failed to fetch popular movies"
          );
        }
        setPopularMovies(detailedPopularMovies);

        const topRatedData = await fetch(
          ` ${import.meta.env.VITE_SERVER_URL}/api/movies/${city}/toprated`,
          { credentials: "include" }
        );
        const detailedTopRated = await topRatedData.json();
        if (!topRatedData.ok) {
          throw new Error(
            detailedTopRated.message || "Failed to fetch top-rated movies"
          );
        }
        setTopRatedMovies(detailedTopRated);

        const nowPlayingData = await fetch(
          ` ${import.meta.env.VITE_SERVER_URL}/api/movies/${city}/nowplaying`,
          { credentials: "include" }
        );
        const detailedNowPlaying = await nowPlayingData.json();
        if (!nowPlayingData.ok) {
          throw new Error(
            detailedNowPlaying.message || "Failed to fetch now playing movies"
          );
        }
        setNowPlayingMovies(detailedNowPlaying);

        const upcomingData = await fetch(
          ` ${import.meta.env.VITE_SERVER_URL}/api/movies/upcoming`,
          { credentials: "include" }
        );
        const detailedUpcoming = await upcomingData.json();
        if (!upcomingData.ok) {
          throw new Error(
            detailedUpcoming.message || "Failed to fetch upcoming movies"
          );
        }
        setUpcomingMovies(detailedUpcoming);

        setLoading(false);
      } catch (error) {
        setError(error.message || "Failed to fetch movies");
        setLoading(false);
      }
    };

    fetchAllMovies();
  }, [city]);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <Header />
      {loading ? (
        <Loader />
      ) : (
        <Home
          popularMovies={popularMovies}
          topRatedMovies={topRatedMovies}
          nowPlayingMovies={nowPlayingMovies}
          upcomingMovies={upcomingMovies}
        />
      )}
      <Footer />
    </div>
  );
}

export default HomePage;
