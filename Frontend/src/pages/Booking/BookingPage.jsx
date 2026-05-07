import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../../components/Layout/Header";
import Loader from "../../components/Loader/Loader";
import MovieInfo from "../../components/MovieInfo/MovieInfoBookingPage";
import SeatMatrix from "../../components/Booking/SeatMatrix";
import { useCity } from "../../contexts/CityContext";
import { useUser } from "../../contexts/userContext";
import ErrorMessage from "../../components/Error/ErrorMessage";
import "./BookingPage.css";

export default function BookingPage() {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [movieInfo, setMovieInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { title, showId } = useParams();
  const [error, setError] = useState();

  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        const movieData = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/movies/${title}`,
          { credentials: "include" }
        );
        const detailedMovie = await movieData.json();
        if (!movieData.ok) {
          throw new Error(detailedMovie.message || "Failed to fetch movie data");
        }
        setMovieInfo(detailedMovie[0]);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        setError(error.message);
      }
    };
    fetchMovieData();
  }, []);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div>
      <div
        style={{
          background: `
            radial-gradient(circle, rgba(0,0,0,0.7) 50%, rgba(0,0,0,1) 100%) no-repeat center/cover,
            url(${movieInfo.bgImage}) no-repeat center/cover
          `,
        }}
        id="BookingPage"
      >
        <MovieInfo info={movieInfo} />
        <div className="booking-page-flex-row">
          <div className="booking-page-center">
            <SeatMatrix
              error={error}
              setError={setError}
              showId={showId}
              selectedSeats={selectedSeats}
              setSelectedSeats={setSelectedSeats}
              movieInfo={movieInfo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
