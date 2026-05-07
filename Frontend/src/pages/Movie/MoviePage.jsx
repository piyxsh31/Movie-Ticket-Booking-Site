import { useEffect, useState } from "react";
import Header from "../../components/Layout/Header";
import Loader from "../../components/Loader/Loader";
import BookingPage from "../Booking/BookingPage";
import MoviePageTexts from "./MoviePageTexts";
import { useParams } from "react-router-dom";
import ErrorMessage from "../../components/Error/ErrorMessage";

function MoviePage() {
  const { title } = useParams();
  let [movies, setMovies] = useState([]);
  let [loading, setLoading] = useState(true);
  let [reviews, setReviews] = useState([]);
  const [error, setError] = useState();
  useEffect(() => {
    const fetchAllMovies = async () => {
      try {
        const movieData = await fetch(
          ` ${import.meta.env.VITE_SERVER_URL}/api/movies/${title}`,
          { credentials: "include" }
        );
        const detailedMovies = await movieData.json();
        if (!movieData.ok) {
          throw new Error(detailedMovies.message || "Failed to fetch movie data");
        }
        const reviewsData = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/reviews/${detailedMovies[0]._id}`,
          { credentials: "include" })
        
        const detailedReviews = await reviewsData.json();
        if (!reviewsData.ok) {
          throw new Error(detailedReviews.message || "Failed to fetch reviews");
        }
        setReviews(detailedReviews);
        setMovies(detailedMovies);
        setLoading(false);
      } catch (error) {
        setError(error.message || "Failed to fetch movies");
        setLoading(false);
      }
    };

    fetchAllMovies();
  }, []);

  const buildBackgroundStyle = (movie) => {
    const mobileGradient = `linear-gradient(to top, rgba(0,0,0,0.3) 30%, #1a191f 95%), url(${movie.bgImagePhone})`;
    const desktopGradient = `linear-gradient(
        to left,
        rgba(0,0,0,0) 0%,
        rgba(0,0,0,0.2) 30%,
        rgba(0,0,0,0.7) 50%,
        rgba(0,0,0,0.9) 70%,
        #1a191f 100%
      ), url(${movie.bgImage})`;

    return {
      minHeight: "100vh",
      width: "100vw",

      background: window.innerWidth <= 600 ? mobileGradient : desktopGradient,
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "center center",
      position: "relative",
    };
  };

  if(error) {
    return <ErrorMessage message={error} />;
  }

  return (
    
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      {loading ? (
        <>
          <Header nonSticky />
          <Loader />
        </>
      ) : (
        <div style={buildBackgroundStyle(movies[0])}>
          <Header nonSticky />
          <MoviePageTexts info={movies[0]} reviews = {reviews} setReviews = {setReviews}/>
        </div>
      )}
    </div>
  );
}

export default MoviePage;
