import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ShowTimePage.module.css";
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";
import DateTimeTheater from "../../components/Booking/DateTimeTheater";
import MovieInfo from "../../components/MovieInfo/MovieInfoBookingPage";
import { useCity } from "../../contexts/CityContext";
import Loader from "../../components/Loader/Loader";
import ErrorMessage from "../../components/Error/ErrorMessage";

function formatCurrentDate() {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = now.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
  return `${day}, ${monthDay}`;
}

function formatTime(unix) {
  const date = new Date(unix * 1000);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}.${minutes} ${ampm}`;
}

function ShowTimePage() {
  const { title } = useParams();
  const navigate = useNavigate();
  const { city } = useCity();
  const [movieInfo, setMovieInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [liveInfo, setLiveInfo] = useState({
    theatres: [],
    date: formatCurrentDate(),
    formats: [],
    languages: [],
    format: "",
    language: "",
  });

  useEffect(() => {
    const fetchShowData = async () => {
      try {
        console.log(city, title, liveInfo.date);
        const theatreData = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/shows/${city}/${title}/${liveInfo.date}`
        );
        const theatres = await theatreData.json();
        if (!theatreData.ok) {
          throw new Error(theatres.message || "Failed to fetch show data");
        }

        if (theatres.length > 0) {
          const langs = [];
          for (const theatre of theatres) {
            for (const timing of theatre.timings) {
              if (!langs.includes(timing.language)) {
                langs.push(timing.language);
              }
            }
          }

          const lang = langs[0];

          const formats = [];
          for (const theatre of theatres) {
            for (const timing of theatre.timings) {
              if (
                timing.language === lang &&
                !formats.includes(timing.format)
              ) {
                formats.push(timing.format);
              }
            }
          }

          const format = formats[0];

          setLiveInfo((curr) => ({
            ...curr,
            theatres: theatres,
            formats: formats,
            languages: langs,
            language: lang,
            format: format,
          }));
        } else {
          setLiveInfo((curr) => ({
            date:curr.date,
            theatres: [],
            formats: [],
            languages: [],
            format: "",
            language: "",
          }));
        }
      } catch (error) {
        setError(error.message || "Failed to fetch show data");
      }
    };

    fetchShowData();
  }, [title, city, liveInfo.date]);

  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        const movieData = await fetch(
          ` ${import.meta.env.VITE_SERVER_URL}/api/movies/${title}`
        );
        const detailedMovie = await movieData.json();
        if (!movieData.ok) {
          throw new Error(
            detailedMovie.message || "Failed to fetch movie data"
          );
        }
        setMovieInfo(detailedMovie[0]);
        setLoading(false);
      } catch (error) {
        setError(error.message || "Failed to fetch movie data");
        setLoading(false);
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
    <div className={styles.container}>
      <Header />
      {loading ? (
        <Loader />
      ) : (
        <div
          style={{
            background: `
              radial-gradient(circle, rgba(0,0,0,0.7) 50%, rgba(0,0,0,1) 100%) no-repeat center/cover,
              url(${movieInfo.bgImage}) no-repeat center/cover
            `,
          }}
          className={styles.movieSection}
        >
          <MovieInfo info={movieInfo} />

          <section className={styles.showsSection}>
            <DateTimeTheater
              title={title}
              liveInfo={liveInfo}
              setLiveInfo={setLiveInfo}
            />
          </section>
        </div>
      )}
      <Footer />
    </div>
  );
}

export default ShowTimePage;
